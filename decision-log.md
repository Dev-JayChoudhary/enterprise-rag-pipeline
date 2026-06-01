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