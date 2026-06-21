import os
import chromadb

# Define where ChromaDB will save its files locally
DB_PATH = os.path.join(os.getcwd(), "chroma_data")

def get_db_client():
    """Initializes and returns a persistent local ChromaDB client."""
    return chromadb.PersistentClient(path=DB_PATH)

def get_influencer_collection():
    """Retrieves or creates the vector collection for influencer profiles."""
    client = get_db_client()
    # We use cosine similarity to measure how mathematically close the profiles match the campaign
    return client.get_or_create_collection(
        name="influencer_profiles",
        metadata={"hnsw:space": "cosine"}
    )