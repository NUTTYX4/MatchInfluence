import asyncio
import json
from app.database import AsyncSessionLocal
from app.services.data_service import DataIngestionService

async def seed_database():
    print("Loading synthetic profiles...")
    with open("data/mock_influencers_v2.json", "r") as f:
        profiles = json.load(f)

    async with AsyncSessionLocal() as db:
        for profile in profiles:
            # Since we haven't wired up OpenAI yet, we inject a dummy 384-dimensional 
            # vector to satisfy ChromaDB's local 'all-MiniLM-L6-v2' space requirement.
            dummy_vector = [0.01] * 384 
            
            await DataIngestionService.save_influencer(
                db=db,
                influencer_data=profile,
                embedding=dummy_vector
            )
            print(f"✅ Successfully ingested: {profile['username']}")
            
    print("\nDatabase seeding complete! PostgreSQL and ChromaDB are synchronized.")

if __name__ == "__main__":
    asyncio.run(seed_database())