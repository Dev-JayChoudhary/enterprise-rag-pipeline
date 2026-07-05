# Enterprise RAG Pipeline - Decision Log

## Week 1 Summary - What I built and Why

### Project elevator pitch (30 seconds)
I'm building an Enterprise RAG Pipeline for companies
that need to query internal sensitive documents without 
sending data to external APIs. It uses hybrid BM25 +
vector search, cross-encoder re-ranking and RAGAs
evaluation. Unlike basic RAG projects, mine can measure
its own accuracy and explain every architectural decision.

### Core technical decisions made this week:

| Decisions               | What i chose | Why 
|                         |              |   
| Loop vs Generator       | Generator    | 42, 000x memory efficient for PDF chunks
| Random ID vs hashlib    | hashlib      | Same content = same ID = automatic deduplication
| List vs DataFrame       | DataFrame    | GroupBy, filter, analyze pipeline health in on line
| SGD vs Adam             | Adam         | Adapts learning rate per parameter, faster convergence
| CPU vs GPU              | GPU          | CUDA 12.1, needed for LoRA fine-tuning in Week 6
| Basic RAG vs Enterprise | Enterprise   | Hybrid search, re-ranking, eval, multi-tenancy


### Biggest bugs caught this week:
1. Cache decorator - case sensitive matching
   Fix: normalize with .lower().strip() before lookup

2. Called update_status() instead of update_score()
   Fix: added [SCORED] print inside method to confirm
   which method actually runs during development

3. Gradient accumulation - forget zero_grad()
   Fix: always zero_grad() before backward() in training loop


## Day 01 — Python Patterns

### Why generators over lists for PDF processing?
A list of 1 million chunks uses 8MB of memory.
A generator for the same data uses 200 bytes — 42,000x less.
When processing large PDFs in the RAG pipeline, loading
everything into memory at once would crash the program.
Generators yield one chunk at a time — memory stays flat
regardless of document size.

##  Day 01 - Python patterns complete

### What I built today that connects to the RAG project:
- chunk reader using generators (Week $ - pdf ingestion)
- @logger decorator (Week 5 - FastAPI endpoints)
- @cache decorator with normalization ( Week 5 - embedding cache)
- VectorDBConnection context manager (Week 4 - ChromaDB)
- Document and QueryResult dataclasses(Week 4 - data models)
- process_rag_pipeline with (*args/** kwargs) (Week 5 - ppeline)

### Biggest mistake today:
First cache decorator was case sensitive -"RAG" and "rag" were treated as different queries. Fixed with .lower().strip() normalization before cache lookup.

## Day02 - OOP

### Why a Document class instead of plain dicts?
Dicts have no validation — anyone can pass empty text
or missing keys and the bug appears 10 functions later.
Document class validates at creation time, fails fast,
and provides methods that travel with the data.

### Why hashlib for document IDs?
Same text from same source always generates the same ID.
This means duplicate detection is automatic — if two 
pipeline runs process the same PDF, the second run 
skips already-processed documents without extra logic.

### Why PDFDocument inherits from Document?
DocumentCollection accepts Document objects.
Since PDFDocument IS a Document (isinstance check),
the collection works for both types without any changes.
One collection class handles all document types.

## Day 03 - NumPy

### Why cosine similarity over euclidean distance?
Cosine similarity measures the angle between vectors,
not the distance. Two documents can have different 
lengths but similiar meaning - cosine similarity handles 
this correctly, euclidean distance does nto.
A short chunk and a long chunk about RAG will score
high similarity. Euclidean distance would peanlize
the length differnce unfairly.

### Why normalize before dot product?
Normalized vectors (magnitude =1.0) make cosine 
similarity equal to a simple dot product.
np.dot(a,b) on normalized vectors = cosine similarity.
ChromaDB does this internally

### Why threshold filtering?
Returning low-confidence chunks to the LLM adds noise.
A chunk with score 0.06 is barely related to the query.
Giving the LLM noisy context causes hallucinations.
Threshold = 0.1 to 0.3 is a reasonabel starting point
depending on the domain.

## Day 04 -pandas

### Why Pandas for metadata management?
Every document in thr pipeline has metadata - source,
status, score, quality. Pandas lets ud filter, group,
and analyze this data in one line instead of writing
loops. In production this wraps a PostgreSQL table - 
same operations, jsut SQL under hood.

### Bug caught today:
Called update_status() instead of update_score() when
scoring documents. Scores went into the status column - 
silent bug, no error thrown. Fix: always verify metehod 
names when pipeline has similar-sounding methods.
Always add print statements inside methods during
development to confirm which method is actually running.

## Day 05 - Matplotlib & EDA

### What the dashboard revealed:
- All sources score below 0.7 threshold on average
- This means chunking strategy needs improvement
- Smaller chunks may produce higher similarity scores
- vector_db.pdf scores lowest(0.48) - needs investigation

### Why rolling average on time series?
Daily scores fluctuate heavily due to document variety.
A 7-day rolling average reveals the actual trend -
are scores improving or degrading over time?
Without rolling average you'd react to noise
instead of real signal.

### Why save plots as PNG?
Pipelinr dashboard needs to be shareable.
In production these plots auto-generate daily
and get emailed to the team or posted to slack.

## Day 06 - PyTorch

### Why GPU for traning?
RTX 3050 6GB via CUDA 12.1
Even for small networks GPU parallelism helps.
for Week 6 LoRA fine-tuning on a 7B model,
6GB VRAM is enough for 4-bit quantization.
Without GPU that would be impossible on a laptop.

### Why Adam over plain SGD?
Adam adpts the learning rate per perimeter.
SGD uses the same learning rate for almost everything.
Adam converges faster and is more stable -
it's the default optimizer for almost all
modern deep learning tasks.

### Why Zero_grad() before backward()?
PyTorch accumulates gradients by default.
Without zeroing, gradients from previous
batches add to current batch gradientds - 
weights update incorrectly and training breaks.
This is one of the most common PyTorch bugs.

### Why model.eval() before inference?
Disables dropout and batchnorm training behaviour.
Without it, inference gives defferent results
everytime due to random dropout. Always set
eval() before serving predictions in production

## Day 08 - HuggingFace

### Why all-MiniLM_L6-v2 for embeddings?
384 dimensions - small and fast, good for development,
In production we'll upgrade to text-embedding-ada-002
(OpenAI, 1536 dims) or bge-large-en (HuggingFace, 1024 dims)
for better accuracy . MiniLM is perfect for learning 
because ir downloads fast and runs fast on cpu if needed.

## Why sentence-transformer over raw BERT?
Raw Bert outputs one vector per token - You'd need to 
pool them manually. sentence-transformers handles this
automatically and is optimized significally for semantic
similarity tasks. It's the industry standard for RAG
embedding generation

## Real vs random embeddings - the difference:
Day 3 with random embeddings: Python ranked above RAG chunks
Day 8 with real embeddings: Pyhthon correctly ranked last
This proves embeddings encode actual meaning, not just numbers.
Semantic search only works because of this.

### What attention mast does:
Padding tokens are added to make batches same length.
Without attention mask, model would waste compution
on padding zeros and produce wrong results.
Mask = 1 means real token, 0 means ignore this position.

## Day 09 - Fine-tuning BERT

### Why fine-tuned instead of training from scratch?
BERT already learned language from 3.3 billion words.
Fine-tuning adds one new skill on top in minutes.
Training from scratch could need weeks and massive compute.
Transfer learning is why modern NLP is accessible.

### Wht 2000 samples not 25000?
Full dataset would take 30+ minutes on laptop GPU.
2000 samples gave 83.4% accuracy in 1 minute.
For production you'd use full dataset.
During learning, speed of iteration matters more.

### Hallucination sentence misclassified as POSITIVE:
"The model hallucinates facts" -> classified POSITIVE
Root cause: model trained on movie reviews, not ML feedback.
Fix: fine-tune on domain-specific RAG feedback data.
This is why domain-specific fine-tuning exists -
general models fall on specialized vocabulary.

### Why push to HuggingFace Hub?
Public models are resume artifacts.
Anyone can run your model with 3 lines of code.
Shows you can ship ML artifacts, not just train locally.
Interviewers can verify your work instantly.

## Day 10 - LLM + Prompt Engineering?
Free, no credit card, same API structure.
Llama 3.1 8b fast and capable enough learning.
Switch to OpenAI GPT-4o with one line change in production
GROQ's speed (500+ tokens/sec) also helps during development
when you are ieterating on prompts quickly.

## Why temprature=0.1 for RAG?
Higher temprature = more creative = more hallucination risk.
RAG needs factual, consistent answers not creative ones.
0.1 keeps responses grounded in retrieval context.
Use highrt temprature only for creative writing tasks.

## Why pass conversation history explicitly?
LLMs are statelesss - they remember nothing between calls.
Every multi-turn conversation must include full history.
This means token costs grow with conversation length.
Production system implement history truncation to control costs.

## Groq BadRequest Error fix:
Groq rejects messages with 'context' as key - must use 'context.
Also rejects system prompts with certain structural keywords.
Always print raw messages before sending when debugging API errors.

### Why RecursiveCharacterTextSplitter over fixed splitting?
Fixed splitting cuts at character count regardless of sentence
boundaries - a chunk can start mid-sentence losing all context.
Recursive splitter tries paragraph breaks first, then sentences,
then word - always cuts at natural language boundaries.
Overlap ensures a sentence split across two chunk regardless of which 
half contains the query keywords.

### Chunking size tradeoff:
Small chunks (200 chars) -> Precise retrieval, less context per chunk
Large chunks (500 chars) -> more context, but retrieval less precise
Production sweet spot: 300-512 chars with 10-15% overlap


## Day 11 - LangChain

### Why LangChain over manual implementation?
Manual RAG from Day 10 required 80+ lines for one query.
LangChain RAG chain does the same in 15 lines with the | operator.
More importantly LangChain handles edge cases - empty retrievals,
document formatting, chain of operations - that manual code misses.

### LangChain Breaking change caught:
langchain.schema moved to langchain_core.messages in newer versions.
Fix: always check langchain changlog when imports fail.
LangChain updates frequently - pin version in production.

### Why RunnablePassthrough()?
In a RAG chain the question to go to TWO places:
1. The Retriever (to find relevant chunks)
2. The prompt (as the question to answer)
RunnablePassthrough() passes the input through unchanged
to the pompt while the retriever processes it seperately


## Day 12 - ChromaDB 

### Why collection-level isolation over filter-based isolation?
Two approaches to multi-tenancy:
1. One collection, filter by org_id on every query
2. Seperate collection per org

We Chose seperate collection because:
- Filter-based: one bug in filter code = data leak between orgs
- collection-based: physically impossible to cross org boundaries
- Security through architecture, not application logic
- ChromaDB performance is better on smaller focused collections

### Duplicate prevention:
Auto-generated UUIDs caused duplicate documents on re-run.
Fix: use content-based IDs(hashlib of text + source) like Day 2.
Same content = same ID = automatic duduplication on add


## Day 13 - Hybrid Search 

### Why hybrid search over pure vector search?
Demonstrated with RAG-2024-ENTERPRISE product code:
Vector search gave NEGATIVE scores for exact product code docs.
BM25 ranked them 1st and 2nd with scores 2.37 and 1.13.
Hybrid correctly ranked both product docs in top 2.
Pure vector search would have failed this query completely.

### Why RRF over score normalization?
Raw scores are incomparable - BM25 scores 0-10,
vector similarity -1 to1. You cannot average them.
RRF uses rank position only - rank 1 always gets
1/(60+1) regardless of raw score.
This makes merging mathematically sound.

### RRF k=60 - why the value?
k=60 is the standard from the original RRF paper.
Higher k = rank differences matter less (smoother)
Lower k = top ranks dominate more aggressively
k=60 gives balanced fusion in practice


## Day 14 — Complete RAG Pipeline

### Pipeline performance baseline:
Avg latency: 242ms — acceptable for production
Max latency: 318ms — consistent, no spikes
Avg tokens: 203 per query — cost efficient
All answers cited sources correctly

### Why memory limited to 6 messages (3 turns)?
Token costs grow linearly with history length.
6 messages = ~600 extra tokens per query.
Beyond 3 turns, early context rarely helps.
Production systems use summarization to compress
old history instead of dropping it entirely.

### Q3 follow-up "which metric is most important"
returned "I cannot find this" — correct behavior.
The system prompt says answer ONLY from chunks.
Retrieved chunks had no relevance ranking info.
This is NOT a memory bug — it's correct grounding.
Fix: add a "metric importance" document to knowledge base.
Lesson: RAG quality depends on knowledge base completeness.

### Milestone 1 complete:
Working end-to-end pipeline with:
- Hybrid search (BM25 + vector + RRF)
- Multi-tenant ChromaDB isolation
- LLM generation with citations
- Hallucination prevention
- Conversation memory
- Performance tracking

## Day 15 - Cross-Encoder Re-ranking

### Why retrieve 6 but rerank 3?
Retrieval is fast - bi-encoder + BM25 can handle 100 candidates.
Re-ranking is slow - cross-encoder reads each pair fully.
Two-stage pattern: cast wide net (6), then precision filter  (3).
In production: retrieve 20, rerank to 5.

### Rerank score as quality signal:
Score > 0 -> document is relevant to query
Score -3 to 0 -> marginally relevant
Score < -9 -> not relevant at all
Pricing query scored -11.3 -> correctly identified as irrelevant
RAGAs query scores 8.88 -> high confidence match

### Prompt tuning lesson:
"Answer ONLY from chunks" caused LLM to refuse
when chunk had relevant info but didn't use exact query words.
Fix: allow reasoning to connect related information.
Balance needed - strict enough to prevent hallucination,
flexible enough to use available context intelligently.

### Why cross-encoder is slower than bi-encoder:
Bi-encoder: Encode query once, encode docs once, compare vectors,
Cross-encoder: must process every query-doc together.
For 1000 docs: bi-encoder = 1001 forward passes,
cross-encoder = 1000 forward passes (no caching possible).
That's why cross-encoder is only used for re-ranking top candidates.

## Day 16 - RAGAs Evaluation

### Baseline Pipeline scores:
Faithfullness: 1.00 <- Zero hallucination
Answer Relevancy: 0.59 <- needs improvement
Context Precision: 0.61 <- reranking helping but enough
Context Recall: 0.72 <- retrieval coverage acceptable
Overall: 0.73 <- production acceptable threshold

### Why faithfulness is the most important metric:
Faithfulness = 1.0 means the pipeline never made up information.
A hallucinating RAG system is worse than no system at all -
it gives users confident wrong answers.
Our system correctly refuses to answer unknown questions
which is why faithfullness stayed at 1.0.

### Why answer relevancy is low (0.59):
"I cannnot find this information" answers score very low
on relevancy because the generated reverse-questions
are nothing like this original question.
This is expected behaviour - not a real problem.
Filtering out "cannot find" answers before scoring
would give a more accurate relevancy picture.

### Why we implemented metrics manually vs RAGAs library:
RAGAs library had dependency conflicts with langchain version.
Manual implementation forced deeper understanding of how
each metric works - better interview answer than
"I just called ragas.evaluate()"


## Phase 2 + 3 Summary (Days 8-16)

### What I built:
- HuggingFace pipelines — sentiment, NER, QA, zero-shot
- Fine-tuned BERT — 83.4% accuracy, pushed to HuggingFace Hub
- LangChain RAG chain — 15 lines replacing 80 lines of manual code
- ChromaDB MultiTenantVectorStore — collection-level isolation
- HybridSearchRetriever — BM25 + vector + RRF
- EnterpriseRAGPipeline — complete end-to-end system
- CrossEncoder re-ranking — retrieve 6, rerank to 3
- RAGEvaluator — 4 metrics, baseline scores established

### Key metrics established:
Faithfulness:      1.00 ← zero hallucinations
Answer Relevancy:  0.59 ← low due to "cannot find" answers
Context Precision: 0.61 ← reranking improving this
Context Recall:    0.72 ← retrieval coverage good
Overall:           0.73 ← production acceptable

### Key decisions made:
| Decision | Choice | Why |
|----------|--------|-----|
| Bi-encoder for retrieval | all-MiniLM-L6-v2 | Fast, 384 dims, good for dev |
| Cross-encoder for reranking | ms-marco-MiniLM-L-6-v2 | Reads query+doc together |
| Retrieve 6 rerank to 3 | Two-stage | Speed + precision balance |
| Collection isolation | Per-org collections | Security through architecture |
| RAGAs manual implementation | Custom code | Library had dependency conflicts |
| Groq over OpenAI | Free, same API | Cost-free development |

## Day 18 — FastAPI Backend

### Why FastAPI over Flask?
FastAPI is async by default — handles concurrent requests efficiently.
Automatic OpenAPI docs (Swagger UI) — zero extra work.
Pydantic validation — request errors caught before hitting pipeline.
Type hints throughout — cleaner, more maintainable code.
Flask is synchronous — would block on every LLM call.

### Why CORS middleware?
React frontend runs on localhost:3000.
FastAPI runs on localhost:8000.
Browser blocks cross-origin requests by default.
CORS middleware tells browser these origins are trusted.
In production restrict allow_origins to your actual domain.

### API design decisions:
Per-org isolation maintained through org_id in every request.
Conversation memory stored server-side per org_id.
Stateless requests with stateful memory — best of both worlds.
Swagger UI gives free interactive documentation — 
anyone can test the API without writing code.

## Day 19 — JWT Authentication

### Why JWT over sessions?
Sessions require server-side storage — doesn't scale.
JWT is stateless — token contains all user info.
Any server instance can verify any token using SECRET_KEY.
Essential for horizontal scaling and microservices.

### Why org_id from token not request?
If org_id came from request body:
User could send org_id="competitor_corp" and access their data.
With JWT: org_id is set at registration and embedded in token.
User cannot change it without a new token from the server.
Security through token — not through user honesty.

### Why role-based access control?
Different users need different permissions:
Admin → can ingest documents (expensive, privileged operation)
User  → can only query (read-only, safe operation)
RBAC enforces this at the API layer — pipeline never sees
unauthorized requests.

### bcrypt version fix:
passlib bcrypt error with newer bcrypt versions.
Fix: pin bcrypt==4.0.1 for compatibility.
Always pin security library versions in production. 


## Day 20 — Docker

### Why Docker over running directly?
"Works on my machine" is not a deployment strategy.
Docker packages code + dependencies + runtime together.
Same container runs identically on:
- Your laptop
- AWS EC2
- Any teammate's machine
No more "it worked yesterday" debugging.

### Why slim base image?
python:3.11-slim vs python:3.11
Slim: ~150MB, full: ~900MB
Smaller image = faster deployment, less attack surface.
Only install what you need — gcc for native extensions.

### Why pin dependency versions?
Unpinned: pip install fastapi → gets latest version
Latest version might break existing code silently.
Pinned versions = reproducible builds every time.
Critical for production — same image built 6 months later
should behave identically.

### Why persistent volumes?
Without volumes: container restart = all ChromaDB data lost.
Volume mounts ./api_db to /app/api_db inside container.
Data lives on host machine, container just accesses it.
Also mounted model cache — avoids re-downloading
500MB+ of models on every container restart.

## Day 23 — React Frontend

### Why Vite over Create React App?
Vite is 10-100x faster than CRA for development.
Hot module replacement is near instant.
CRA is deprecated — Vite is the current standard.

### Why Vercel for frontend?
Free, automatic HTTPS, global CDN.
Deploys from git push automatically.
Zero configuration for React/Vite apps.

### Mixed content HTTPS fix:
Vercel serves HTTPS, EC2 serves HTTP.
Browsers block mixed content requests.
Fix: Vercel rewrites proxy /api/* to EC2.
Frontend calls /api/query → Vercel proxies to http://EC2:8000/query.
All traffic stays HTTPS from browser perspective.
Production fix would be SSL certificate on EC2 via Let's Encrypt.

### Frontend architecture:
api.js — single file for all API calls with axios interceptor
JWT token stored in localStorage — auto-attached to every request
Tab-based UI — Chat and Ingest/Stats separation
Role-based UI — admin sees ingest, user sees stats only