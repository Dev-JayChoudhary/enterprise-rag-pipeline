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