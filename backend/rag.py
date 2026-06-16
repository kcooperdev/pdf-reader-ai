"""RAG pipeline: ingest PDFs and answer questions using FAISS + OpenAI."""

import hashlib
from pathlib import Path

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate

import config

embeddings = OpenAIEmbeddings(openai_api_key=config.openai_api_key)
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0,
    openai_api_key=config.openai_api_key,
)

QA_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template="""You are a helpful assistant that answers questions about uploaded documents.

Rules:
- Answer using ONLY the information in the context below.
- The context may contain excerpts from one or more documents — use all of it.
- For broad questions like "what is this about?" or "summarise the document", write a \
structured overview based on the topics present in the context.
- Only say "I couldn't find that information in the uploaded document." if the context \
is genuinely empty or completely unrelated to the question.
- Format every response in clean, readable Markdown:
  - Use **bold** for key terms or important values.
  - Use bullet or numbered lists for multiple items, steps, or findings — never a wall of text.
  - Use ## or ### headers when the answer has distinct sections.
  - Use `inline code` for exact names, numbers, or technical terms from the document.
  - Use a blockquote (>) for direct quotes.
  - Keep paragraphs short and focused.
  - Do NOT wrap the entire response in a code block.
  - Do NOT output JSON.

Context:
{context}

Question: {question}

Answer:""",
)


def _index_path(pdf_path: Path) -> Path:
    """Return the FAISS index directory for a given PDF file."""
    file_hash = hashlib.md5(pdf_path.read_bytes()).hexdigest()[:12]
    return config.vectorstore_dir / f"{pdf_path.stem}_{file_hash}"


def ingest(pdf_path: Path) -> str:
    """Load, split, embed, and persist a PDF. Returns the index path as a string."""
    idx_path = _index_path(pdf_path)

    if idx_path.exists():
        return str(idx_path)

    loader = PyPDFLoader(str(pdf_path))
    docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=config.chunk_size,
        chunk_overlap=config.chunk_overlap,
    )
    chunks = splitter.split_documents(docs)

    if not chunks:
        raise ValueError("No text could be extracted from the PDF.")

    store = FAISS.from_documents(chunks, embeddings)
    store.save_local(str(idx_path))
    return str(idx_path)


def answer(question: str, index_paths: list[str]) -> dict:
    """Retrieve relevant chunks from one or more indexes and answer the question."""
    stores = [
        FAISS.load_local(p, embeddings, allow_dangerous_deserialization=True)
        for p in index_paths
    ]
    # Merge all stores into the first one so we query across all PDFs at once
    merged = stores[0]
    for extra in stores[1:]:
        merged.merge_from(extra)
    retriever = merged.as_retriever(
        search_type="mmr",
        search_kwargs={"k": config.top_k, "fetch_k": config.top_k * 4},
    )

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True,
        chain_type_kwargs={"prompt": QA_PROMPT},
    )

    result = qa_chain.invoke({"query": question})

    sources = []
    for doc in result.get("source_documents", []):
        page = doc.metadata.get("page", 0) + 1
        if page not in sources:
            sources.append(page)

    return {
        "answer": result["result"],
        "source_pages": sorted(sources),
    }
