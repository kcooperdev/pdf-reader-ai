# PDF Reader AI

A simple end-to-end RAG app — upload a PDF, ask questions, get answers grounded in the document.

## Architecture

```
pdf-reader/
├── backend/          # FastAPI + LangChain RAG
│   ├── main.py       # API routes (/upload, /ask, /health)
│   ├── rag.py        # Ingest + retrieval pipeline (FAISS + OpenAI)
│   ├── config.py     # Settings from .env
│   ├── uploads/      # Saved PDF files
│   ├── vectorstore/  # Persisted FAISS indexes
│   └── requirements.txt
└── frontend/         # Next.js chat UI
    └── src/app/
        └── page.tsx  # Single-page chat interface
```

**Flow:**
1. User uploads PDF → backend chunks it, embeds with OpenAI, saves FAISS index locally
2. User asks a question → backend retrieves top-k chunks, sends to GPT-4o-mini with a strict RAG prompt
3. Answer + source page numbers returned to the UI

## Prerequisites

- Python 3.11+
- Node.js 18+
- An OpenAI API key

## Setup & Run

### 1. Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure your API key
cp .env.example .env
# Edit .env and set OPENAI_API_KEY=sk-...

# Start the API server
.venv/bin/python3 -m uvicorn main:app --reload --port 8000
```

The API is now at http://localhost:8000. Swagger docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend

npm install
npm run dev
```

The app is now at **http://localhost:3000**.

## Usage

1. Open http://localhost:3000
2. Drop a PDF onto the upload zone (or click to browse)
3. Wait a few seconds for indexing to complete
4. Type a question and press Enter (or click Send)

## Notes

- Embeddings and FAISS indexes are cached in `backend/vectorstore/` — re-uploading the same file skips re-embedding.
- The LLM is instructed to answer only from the document; it will say so if the answer isn't there.
- To switch models, edit `llm = ChatOpenAI(model=...)` in `backend/rag.py`.
