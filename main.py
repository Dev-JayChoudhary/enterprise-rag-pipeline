import os
import uuid
import time
import uvicorn
from datetime import datetime, timedelta
from typing import Optional, List, Dict

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from dotenv import load_dotenv

from jose import JWTError, jwt
from passlib.context import CryptContext
from groq import Groq
from sentence_transformers import SentenceTransformer, CrossEncoder
from rank_bm25 import BM25Okapi
import chromadb

load_dotenv()

# ── Security Config ───────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# ── App ──────────────────────────────────────────
app = FastAPI(
    title="Enterprise RAG Pipeline API",
    description="Query internal documents using hybrid search + LLM",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ── In-memory user store (replace with DB in production) ──
users_db: Dict = {}

# ── Pydantic Models ──────────────────────────────
class UserRegister(BaseModel):
    username: str
    password: str
    org_id: str
    role: str = "user"  # user or admin

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    org_id: str
    role: str

class TokenData(BaseModel):
    username: Optional[str] = None
    org_id: Optional[str] = None
    role: Optional[str] = None

class QueryRequest(BaseModel):
    question: str
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
    texts: List[str]
    metadatas: List[Dict]

class IngestResponse(BaseModel):
    org_id: str
    documents_added: int
    status: str

# ── Auth Functions ───────────────────────────────
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"}
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        org_id = payload.get("org_id")
        role = payload.get("role")
        if username is None:
            raise credentials_exception
        return TokenData(username=username, org_id=org_id, role=role)
    except JWTError:
        raise credentials_exception

def require_admin(current_user: TokenData = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# ── Pipeline Components ──────────────────────────
print("Loading models...")
embedder = SentenceTransformer("all-MiniLM-L6-v2")
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
print("Models loaded")

pipelines: Dict = {}
conversation_histories: Dict = {}

def get_or_create_pipeline(org_id: str):
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
    pipeline = get_or_create_pipeline(org_id)
    collection = pipeline["collection"]
    bm25_data = pipeline["bm25_data"]

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

    bm25_ranked = []
    if bm25_data["bm25"] is not None:
        scores = bm25_data["bm25"].get_scores(query.lower().split())
        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)[:n]
        bm25_ranked = [(bm25_data["ids"][idx], score) for idx, score in ranked]

    rrf_scores = {}
    for result_set in [vector_ranked, bm25_ranked]:
        for rank, (doc_id, _) in enumerate(result_set):
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + 1.0 / (60 + rank + 1)

    merged = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:n]

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
    if not chunks:
        return chunks
    pairs = [[query, chunk["text"]] for chunk in chunks]
    ce_scores = reranker.predict(pairs)
    for i, chunk in enumerate(chunks):
        chunk["rerank_score"] = float(ce_scores[i])
    reranked = sorted(chunks, key=lambda x: x["rerank_score"], reverse=True)
    return reranked[:n]

def generate_answer(org_id: str, question: str, chunks: list) -> tuple:
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

    conversation_histories[org_id] = history + [
        {"role": "user", "content": question},
        {"role": "assistant", "content": answer}
    ]

    return answer, tokens

# ── Auth Routes ──────────────────────────────────
@app.post("/auth/register", response_model=Token)
def register(user: UserRegister):
    if user.username in users_db:
        raise HTTPException(status_code=400, detail="Username already exists")

    users_db[user.username] = {
        "username": user.username,
        "hashed_password": hash_password(user.password),
        "org_id": user.org_id,
        "role": user.role
    }

    token = create_access_token({
        "sub": user.username,
        "org_id": user.org_id,
        "role": user.role
    })

    print(f"[AUTH] Registered: {user.username} | org: {user.org_id} | role: {user.role}")

    return Token(
        access_token=token,
        token_type="bearer",
        org_id=user.org_id,
        role=user.role
    )

@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = users_db.get(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    token = create_access_token({
        "sub": user["username"],
        "org_id": user["org_id"],
        "role": user["role"]
    })

    print(f"[AUTH] Login: {user['username']} | org: {user['org_id']}")

    return Token(
        access_token=token,
        token_type="bearer",
        org_id=user["org_id"],
        role=user["role"]
    )

@app.get("/auth/me")
def get_me(current_user: TokenData = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "org_id": current_user.org_id,
        "role": current_user.role
    }

# ── Protected Routes ─────────────────────────────
@app.get("/health")
def health():
    return {"status": "healthy", "version": "2.0.0"}

@app.post("/ingest", response_model=IngestResponse)
def ingest(
    request: IngestRequest,
    current_user: TokenData = Depends(require_admin)
):
    """Only admins can ingest documents"""
    if not request.texts:
        raise HTTPException(status_code=400, detail="No texts provided")
    if len(request.texts) != len(request.metadatas):
        raise HTTPException(status_code=400, detail="Length mismatch")

    org_id = current_user.org_id
    pipeline = get_or_create_pipeline(org_id)
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
        org_id=org_id,
        documents_added=len(request.texts),
        status="success"
    )

@app.post("/query", response_model=QueryResponse)
def query(
    request: QueryRequest,
    current_user: TokenData = Depends(get_current_user)
):
    """Any authenticated user can query their org's documents"""
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    org_id = current_user.org_id
    start = time.time()

    candidates = hybrid_search(org_id, request.question, n=6)
    if not candidates:
        return QueryResponse(
            question=request.question,
            answer="No documents found. Please ask an admin to ingest documents first.",
            sources=[],
            latency_ms=0,
            tokens=0,
            chunks_retrieved=0,
            chunks_after_rerank=0
        )

    reranked = rerank_chunks(request.question, candidates, n=request.n_results)
    answer, tokens = generate_answer(org_id, request.question, reranked)
    latency = (time.time() - start) * 1000
    sources = list(set([c["metadata"].get("source", "unknown") for c in reranked]))

    return QueryResponse(
        question=request.question,
        answer=answer,
        sources=sources,
        latency_ms=round(latency, 2),
        tokens=tokens,
        chunks_retrieved=len(candidates),
        chunks_after_rerank=len(reranked)
    )

@app.delete("/memory")
def clear_memory(current_user: TokenData = Depends(get_current_user)):
    conversation_histories[current_user.org_id] = []
    return {"status": "memory cleared", "org_id": current_user.org_id}

@app.get("/stats")
def get_stats(current_user: TokenData = Depends(get_current_user)):
    pipeline = get_or_create_pipeline(current_user.org_id)
    return {
        "org_id": current_user.org_id,
        "username": current_user.username,
        "role": current_user.role,
        "total_documents": pipeline["collection"].count(),
        "memory_messages": len(conversation_histories.get(current_user.org_id, []))
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)