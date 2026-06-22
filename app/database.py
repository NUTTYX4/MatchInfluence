import chromadb
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings

# ==========================================
# 1. PostgreSQL Asynchronous Configuration
# ==========================================

# create_async_engine manages our asynchronous connection pool to Postgres
engine = create_async_engine(
    settings.DATABASE_URL, 
    echo=True,  # Set to True to see raw SQL logs in your terminal (great for debugging)
)

# async_sessionmaker acts as a factory for creating unique database sessions
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession
)

# FastAPI Dependency to yield a unique database session per API request
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


# ==========================================
# 2. ChromaDB Configuration (v1 Baseline)
# ==========================================

# Retaining your local vector persistence setup using centralized settings
chroma_client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)

# Fetching or initializing the collection with cosine distance metrics
chroma_collection = chroma_client.get_or_create_collection(
    name="influencer_embeddings",
    metadata={"hnsw:space": "cosine"}
)