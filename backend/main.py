"""FastAPI entrypoint."""

import uuid
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
from rag import answer, ingest

app = FastAPI(title="PDF RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store: session_id -> index_path
sessions: dict[str, str] = {}


class QuestionRequest(BaseModel):
    session_ids: list[str]
    question: str


class QuestionResponse(BaseModel):
    answer: str
    source_pages: list[int]


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)) -> dict:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    session_id = str(uuid.uuid4())
    dest = config.upload_dir / f"{session_id}_{file.filename}"
    dest.write_bytes(await file.read())

    try:
        index_path = ingest(dest)
    except ValueError as exc:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    sessions[session_id] = index_path
    return {"session_id": session_id, "filename": file.filename}


@app.post("/ask", response_model=QuestionResponse)
def ask_question(req: QuestionRequest) -> QuestionResponse:
    if not req.session_ids:
        raise HTTPException(status_code=400, detail="No session IDs provided.")

    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    index_paths = []
    for sid in req.session_ids:
        path = sessions.get(sid)
        if not path:
            raise HTTPException(status_code=404, detail=f"Session '{sid}' not found.")
        index_paths.append(path)

    try:
        result = answer(req.question, index_paths)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return QuestionResponse(**result)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
