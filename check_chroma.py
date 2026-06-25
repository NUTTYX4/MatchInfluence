import chromadb
from app.config import settings

# Initialize ChromaDB client pointing to local dir
client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)
collection = client.get_collection(name="influencer_embeddings")

count = collection.count()
print(f"Total embeddings in ChromaDB: {count}")

if count > 0:
    results = collection.get(limit=1, include=["metadatas"])
    print(f"First item metadata: {results['metadatas'][0]}")
