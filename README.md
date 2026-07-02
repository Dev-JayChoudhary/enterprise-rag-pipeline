# Enterprise RAG Pipeline

Enterprise RAG Pipeline with hybrid search , re-ranking and evaluation.

![Test API](https://github.com/YOUR_USERNAME/enterprise-rag-pipeline/actions/workflows/test.yml/badge.svg)

A production-grade Enterprise RAG pipeline with hybrid search, 
re-ranking, JWT authentication and Docker deployment.

## Tech Stack
- **Retrieval**: BM25 + Vector Search + RRF (Hybrid)
- **Re-ranking**: Cross-encoder (ms-marco-MiniLM-L-6-v2)
- **LLM**: Llama 3.1 8B via Groq API
- **Vector DB**: ChromaDB (multi-tenant)
- **Backend**: FastAPI + JWT Auth
- **Deployment**: Docker + AWS EC2
- **Evaluation**: RAGAs (Faithfulness: 1.0, Overall: 0.73)

## API Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /auth/register | Public | Register user |
| POST | /auth/login | Public | Get JWT token |
| POST | /ingest | Admin only | Ingest documents |
| POST | /query | Authenticated | Query pipeline |
| GET | /stats | Authenticated | Pipeline stats |
| DELETE | /memory | Authenticated | Clear chat history |

## Performance
- Avg latency: ~400ms
- Faithfulness: 1.0 (zero hallucinations)
- Overall RAGAs score: 0.73

