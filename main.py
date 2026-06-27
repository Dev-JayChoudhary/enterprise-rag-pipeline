
import uvicorn
import os
import uuid
import time
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from dotenv import load_dotenv
from groq import Groq
from sentence_transformers import SentenceTransformer, CrossEncoder
from rank_bm25 import BM25Okapi
import chromadb

load_dotenv()

# ── App ──────────────────────────────────────────
app = FastAPI(
    title="Enterprise RAG Pipeline API",
    description="Query internal documents using hybrid search + LLM",
    version="1.0.0"
)

# CORS — allows React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ── Models ───────────────────────────────────────
class QueryRequest(BaseModel):
    question: str
    org_id: str
    use_memory: bool = True
    n_results: int = 3

class QueryResponse(BaseModel):
    question: str
    answer: str
    sources: List[str]
    latency_ms: float
    tokens: int
    chunks_retrieved: int
    chunks_after_rerank: int

class IngestRequest(BaseModel):
    org_id: str
    texts: List[str]
    metadatas: List[Dict]

class IngestResponse(BaseModel):
    org_id: str
    documents_added: int
    status: str

class EvalRequest(BaseModel):
    org_id: str
    questions: List[str]
    answers: List[str]
    contexts: List[List[str]]
    ground_truths: List[str]

class HealthResponse(BaseModel):
    status: str
    pipeline_ready: bool
    total_orgs: int

# ── Pipeline Components ──────────────────────────
print("Loading models...")
embedder = SentenceTransformer("all-MiniLM-L6-v2")
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
print("Models loaded")

# In-memory pipeline store per org
pipelines: Dict = {}
conversation_histories: Dict = {}

def get_or_create_pipeline(org_id: str):
    """Get or create ChromaDB collection for an org"""
    if org_id not in pipelines:
        chroma_client = chromadb.PersistentClient(path=f"./api_db/{org_id}")
        collection = chroma_client.get_or_create_collection(f"org_{org_id}")
        bm25_data = {"corpus": [], "ids": [], "metadatas": [], "bm25": None}
        pipelines[org_id] = {
            "collection": collection,
            "chroma_client": chroma_client,
            "bm25_data": bm25_data
        }
        conversation_histories[org_id] = []
    return pipelines[org_id]

def hybrid_search(org_id: str, query: str, n: int = 6):
    """Hybrid BM25 + vector search with RRF"""
    pipeline = get_or_create_pipeline(org_id)
    collection = pipeline["collection"]
    bm25_data = pipeline["bm25_data"]

    # Vector search
    qe = embedder.encode(query).tolist()
    count = collection.count()
    if count == 0:
        return []

    vector_results = collection.query(
        query_embeddings=[qe],
        n_results=min(n, count)
    )
    vector_ranked = [
        (vector_results["ids"][0][i], 1 - vector_results["distances"][0][i])
        for i in range(len(vector_results["ids"][0]))
    ]

    # BM25 search
    bm25_ranked = []
    if bm25_data["bm25"] is not None:
        scores = bm25_data["bm25"].get_scores(query.lower().split())
        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)[:n]
        bm25_ranked = [(bm25_data["ids"][idx], score) for idx, score in ranked]

    # RRF fusion
    rrf_scores = {}
    for result_set in [vector_ranked, bm25_ranked]:
        for rank, (doc_id, _) in enumerate(result_set):
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + 1.0 / (60 + rank + 1)

    merged = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:n]

    # Get full document info
    chunks = []
    for doc_id, score in merged:
        if doc_id in bm25_data["ids"]:
            idx = bm25_data["ids"].index(doc_id)
            chunks.append({
                "id": doc_id,
                "text": bm25_data["corpus"][idx],
                "score": score,
                "metadata": bm25_data["metadatas"][idx]
            })
    return chunks

def rerank_chunks(query: str, chunks: list, n: int = 3):
    """Cross-encoder reranking"""
    if not chunks:
        return chunks
    pairs = [[query, chunk["text"]] for chunk in chunks]
    ce_scores = reranker.predict(pairs)
    for i, chunk in enumerate(chunks):
        chunk["rerank_score"] = float(ce_scores[i])
    reranked = sorted(chunks, key=lambda x: x["rerank_score"], reverse=True)
    return reranked[:n]

def generate_answer(org_id: str, question: str, chunks: list) -> tuple:
    """Generate LLM answer with conversation memory"""
    context_parts = []
    for i, chunk in enumerate(chunks):
        context_parts.append(
            f"Chunk {i+1} [{chunk['metadata'].get('source', 'unknown')}]:\n{chunk['text']}"
        )
    context = "\n\n".join(context_parts)
    user_message = f"Document chunks:\n{context}\n\nQuestion: {question}"

    system_prompt = """You are an Enterprise RAG assistant.
Answer questions based on the provided document chunks.
Always cite which chunk you used.
If the answer is not in the chunks say:
I cannot find this information in the provided documents.
Be concise and professional."""

    messages = [{"role": "system", "content": system_prompt}]
    history = conversation_histories.get(org_id, [])
    messages.extend(history[-6:])
    messages.append({"role": "user", "content": user_message})

    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages,
        temperature=0.1,
        max_tokens=500
    )

    answer = response.choices[0].message.content
    tokens = 0
    if response.usage:
        tokens = response.usage.prompt_tokens + response.usage.completion_tokens

    # Update memory
    conversation_histories[org_id] = history + [
        {"role": "user", "content": question},
        {"role": "assistant", "content": answer}
    ]

    return answer, tokens

# ── Routes ───────────────────────────────────────
@app.get("/", response_model=HealthResponse)
def root():
    return HealthResponse(
        status="running",
        pipeline_ready=True,
        total_orgs=len(pipelines)
    )

@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="healthy",
        pipeline_ready=True,
        total_orgs=len(pipelines)
    )

@app.post("/ingest", response_model=IngestResponse)
def ingest(request: IngestRequest):
    if not request.texts:
        raise HTTPException(status_code=400, detail="No texts provided")
    if len(request.texts) != len(request.metadatas):
        raise HTTPException(status_code=400, detail="texts and metadatas length mismatch")

    pipeline = get_or_create_pipeline(request.org_id)
    collection = pipeline["collection"]
    bm25_data = pipeline["bm25_data"]

    ids = [str(uuid.uuid4())[:8] for _ in request.texts]
    embeddings = embedder.encode(request.texts).tolist()

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=request.texts,
        metadatas=request.metadatas
    )

    bm25_data["corpus"].extend(request.texts)
    bm25_data["ids"].extend(ids)
    bm25_data["metadatas"].extend(request.metadatas)
    tokenized = [doc.lower().split() for doc in bm25_data["corpus"]]
    bm25_data["bm25"] = BM25Okapi(tokenized)

    return IngestResponse(
        org_id=request.org_id,
        documents_added=len(request.texts),
        status="success"
    )

@app.post("/query", response_model=QueryResponse)
def query(request: QueryRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    start = time.time()

    # Retrieve
    candidates = hybrid_search(request.org_id, request.question, n=6)
    if not candidates:
        return QueryResponse(
            question=request.question,
            answer="No documents found for this organization. Please ingest documents first.",
            sources=[],
            latency_ms=0,
            tokens=0,
            chunks_retrieved=0,
            chunks_after_rerank=0
        )

    # Rerank
    reranked = rerank_chunks(request.question, candidates, n=request.n_results)

    # Generate
    answer, tokens = generate_answer(request.org_id, request.question, reranked)

    latency = (time.time() - start) * 1000
    sources = [c["metadata"].get("source", "unknown") for c in reranked]

    return QueryResponse(
        question=request.question,
        answer=answer,
        sources=list(set(sources)),
        latency_ms=round(latency, 2),
        tokens=tokens,
        chunks_retrieved=len(candidates),
        chunks_after_rerank=len(reranked)
    )

@app.delete("/memory/{org_id}")
def clear_memory(org_id: str):
    conversation_histories[org_id] = []
    return {"status": "memory cleared", "org_id": org_id}

@app.get("/stats/{org_id}")
def get_stats(org_id: str):
    pipeline = get_or_create_pipeline(org_id)
    return {
        "org_id": org_id,
        "total_documents": pipeline["collection"].count(),
        "memory_messages": len(conversation_histories.get(org_id, []))
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
