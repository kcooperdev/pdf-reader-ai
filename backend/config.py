import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

openai_api_key: str = os.environ["OPENAI_API_KEY"]
upload_dir: Path = Path(os.getenv("UPLOAD_DIR", "uploads"))
vectorstore_dir: Path = Path(os.getenv("VECTORSTORE_DIR", "vectorstore"))
chunk_size: int = int(os.getenv("CHUNK_SIZE", "1000"))
chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "200"))
top_k: int = int(os.getenv("TOP_K", "10"))

upload_dir.mkdir(exist_ok=True)
vectorstore_dir.mkdir(exist_ok=True)
