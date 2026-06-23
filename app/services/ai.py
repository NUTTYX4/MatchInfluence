import asyncio
from sentence_transformers import SentenceTransformer

# Load the model into memory. 
# 'all-MiniLM-L6-v2' is fast, free, and produces 384-dimensional vectors 
# which perfectly matches ChromaDB's default space.
print("Loading HuggingFace AI Model... (This may take a few seconds on the first run)")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("AI Model Loaded Successfully!")

class AIEngine:
    @staticmethod
    def _get_embedding_sync(text: str) -> list[float]:
        """Synchronous internal method for HuggingFace model encoding."""
        return model.encode(text).tolist()

    @staticmethod
    async def get_embedding(text: str) -> list[float]:
        """
        Reads English text and converts its semantic meaning 
        into a 384-dimensional mathematical coordinate.
        Runs in a background thread to prevent blocking the FastAPI event loop.
        """
        # Offload the heavy CPU-bound task to a separate thread
        return await asyncio.to_thread(AIEngine._get_embedding_sync, text)