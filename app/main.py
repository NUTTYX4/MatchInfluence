import os
import json
from fastapi import FastAPI
from pydantic import BaseModel
from app.database import get_db_client, get_influencer_collection

app = FastAPI(title="MatchInfluence Core API", version="1.0.0")

# --- DATA SCHEMAS ---
# This ensures the API strictly expects a 'brief' from the frontend
class CampaignBrief(BaseModel):
    brief: str
    num_results: int = 2  # Default to returning top 2 matches

# --- SYSTEM EVENTS ---
@app.on_event("startup")
async def startup_event():
    get_db_client()
    get_influencer_collection()
    print("MatchInfluence Agent: Persistent Vector Database Online.")

# --- ROUTES ---
@app.get("/")
def health_check():
    return {"status": "online", "database": "ChromaDB Connected"}

@app.post("/seed")
def seed_database():
    """Reads the synthetic JSON data and converts it into mathematical vectors."""
    collection = get_influencer_collection()
    file_path = os.path.join(os.getcwd(), "data", "mock_influencers.json")
    
    with open(file_path, "r") as file:
        influencers = json.load(file)
        
    ids, documents, metadatas = [], [], []
    
    for inf in influencers:
        ids.append(str(inf["id"]))
        documents.append(f"Bio: {inf['bio']} | Recent Posts: {inf['recent_posts']}")
        metadatas.append({
            "username": inf["username"],
            "platform": inf["platform"],
            "follower_count": inf["follower_count"],
            "engagement_rate": inf["engagement_rate"]
        })
        
    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
    return {"status": "success", "message": f"Injected {len(influencers)} profiles."}

@app.post("/match")
def find_matches(campaign: CampaignBrief):
    """Takes a campaign brief and returns the highest-ranking influencer matches."""
    collection = get_influencer_collection()
    
    # ChromaDB automatically embeds the query text and calculates the cosine distance 
    # against every profile in the database.
    results = collection.query(
        query_texts=[campaign.brief],
        n_results=campaign.num_results
    )
    
    # Format the raw vector math into a clean JSON response
    matches = []
    if results['ids'] and len(results['ids']) > 0:
        for i in range(len(results['ids'][0])):
            matches.append({
                "id": results['ids'][0][i],
                "username": results['metadatas'][0][i]["username"],
                "platform": results['metadatas'][0][i]["platform"],
                "follower_count": results['metadatas'][0][i]["follower_count"],
                # The 'distance' score indicates how close the match is mathematically.
                # Lower distance = closer semantic match.
                "match_distance": results['distances'][0][i] 
            })
            
    return {
        "campaign_brief": campaign.brief,
        "top_matches": matches
    }