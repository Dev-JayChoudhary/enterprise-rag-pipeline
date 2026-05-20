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