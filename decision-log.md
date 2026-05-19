## Day 01 — Python Patterns

### Why generators over lists for PDF processing?
A list of 1 million chunks uses 8MB of memory.
A generator for the same data uses 200 bytes — 42,000x less.
When processing large PDFs in the RAG pipeline, loading
everything into memory at once would crash the program.
Generators yield one chunk at a time — memory stays flat
regardless of document size.