# Enterprise RAG Pipeline

![Test API](https://github.com/Dev-JayChoudhary/enterprise-rag-pipeline/actions/workflows/test.yml/badge.svg)
![Deploy](https://github.com/Dev-JayChoudhary/enterprise-rag-pipeline/actions/workflows/deploy.yml/badge.svg)

A production-grade Retrieval Augmented Generation system for enterprises 
that need to query sensitive internal documents without sending data to 
external APIs.

**Live Demo:** https://enterprise-rag-frontend-one.vercel.app  
**API Docs:** http://15.252.18.226:8000/docs

---

## Problem

Large enterprises have sensitive internal documents — legal contracts, 
financial strategies, HR policies. Sending these to external LLMs like 
ChatGPT creates serious data security risks. Enterprise RAG processes 
everything locally with complete org-level data isolation.

---

## Architecture

![Architecture](architecture.png)

---

## What Makes This Different

| Feature | Basic RAG | This Project |
|---|---|---|
| Search | Vector only | BM25 + Vector + RRF |
| Ranking | Single stage | Two-stage with cross-encoder |
| Evaluation | None | RAGAs (4 metrics) |
| Auth | None | JWT + RBAC |
| Multi-tenancy | None | Collection-level isolation |
| Deployment | Local only | Docker + AWS EC2 + CI/CD |

---

## Performance Metrics

| Metric | Score |
|---|---|
| Faithfulness | 1.00 ✅ |
| Answer Relevancy | 0.59 |
| Context Precision | 0.61 |
| Context Recall | 0.72 |
| **Overall RAGAs** | **0.73** |
| Avg Query Latency | ~400ms |
| Zero Hallucinations | ✅ |

---

## Tech Stack

**Retrieval**
- BM25 keyword search (rank-bm25)
- Vector search (ChromaDB + sentence-transformers)
- Reciprocal Rank Fusion for merging

**Re-ranking**
- Cross-encoder (ms-marco-MiniLM-L-6-v2)
- Retrieve 6 candidates → rerank to 3

**Generation**
- Llama 3.1 8B via Groq API
- Conversation memory (last 3 turns)
- Hallucination prevention via system prompt

**Backend**
- FastAPI with async endpoints
- JWT authentication + RBAC
- Pydantic request/response validation

**Infrastructure**
- Docker + docker-compose
- AWS EC2 (Ubuntu 24.04)
- GitHub Actions CI/CD
- Vercel (React frontend)

**Evaluation**
- RAGAs framework (manual implementation)
- Faithfulness, Answer Relevancy, Context Precision, Context Recall

---

## API Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /auth/register | Public | Register user |
| POST | /auth/login | Public | Get JWT token |
| GET | /auth/me | Authenticated | Current user info |
| POST | /ingest | Admin only | Ingest documents |
| POST | /query | Authenticated | Query pipeline |
| GET | /stats | Authenticated | Pipeline statistics |
| DELETE | /memory | Authenticated | Clear conversation |

---

## Quick Start

```bash
# Clone
git clone https://github.com/Dev-JayChoudhary/enterprise-rag-pipeline.git
cd enterprise-rag-pipeline

# Add environment variables
cp .env.example .env
# Edit .env with your GROQ_API_KEY

# Run with Docker
docker-compose up --build -d

# API available at http://localhost:8000/docs
```

---

## Key Decisions

**Why hybrid search over pure vector search?**  
Vector search gave negative scores for exact product codes. BM25 correctly 
ranked them first. Hybrid search using RRF combines both — precision for 
keywords, semantics for concepts.

**Why cross-encoder re-ranking?**  
Bi-encoders compress query and document separately — information is lost.
Cross-encoders read them together — higher precision. Two-stage retrieval:
retrieve 6 fast, rerank to 3 precisely.

**Why collection-level multi-tenancy?**  
Filter-based isolation relies on developer remembering to add filters.
One bug = data leak. Collection-level isolation makes cross-org access
physically impossible.

**Why RAGAs evaluation?**  
Without measurement you're guessing. Faithfulness score of 1.0 proves
zero hallucinations across all test queries. Most candidates can't 
quantify their RAG quality at all.

---

## Project Structure

enterprise-rag-pipeline/
├── main.py                 # FastAPI backend
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── components/
├── notebooks/              # Development notebooks
│   ├── day01-day24/
├── .github/workflows/      # CI/CD
│   ├── test.yml
│   └── deploy.yml
└── decision-log.md         # Architecture decisions

---

## Author

**Jay Kumar Choudhary**  
B.Tech Computer Science (AI), SKIT Jaipur  
GitHub: [@Dev-JayChoudhary](https://github.com/Dev-JayChoudhary)  
HuggingFace: [Havoc-Jay](https://huggingface.co/Havoc-Jay)