from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

# Import our infrastructure and logic
from app.database import get_db
from app.schemas.campaign import CampaignRequest, MatchRunRequest
from app.services.matching import MatchingOrchestrator

from sqlalchemy.future import select
from app.models.campaign import Campaign

# Initialize the API
app = FastAPI(
    title="MatchInfluence API", 
    description="Enterprise Influencer Matching & Scoring Engine",
    version="3.0"
)

@app.get("/")
async def health_check():
    """Confirms the API is online."""
    return {"status": "online", "message": "MatchInfluence Engine V3 is running."}


@app.get("/campaigns")
async def list_campaigns(db: AsyncSession = Depends(get_db)):
    """Temporary endpoint to fetch all live campaign IDs."""
    result = await db.execute(select(Campaign))
    campaigns = result.scalars().all()
    return [{"id": str(c.id), "niche": c.niche, "budget": c.budget} for c in campaigns]
@app.post("/match")
async def match_influencers(request: MatchRunRequest, db: AsyncSession = Depends(get_db)):
    """
    The core matching endpoint. Takes a campaign ID, fetches real details,
    queries ChromaDB, and scores them using PostgreSQL metrics.
    """
    try:
        results = await MatchingOrchestrator.find_best_matches(db, request)
        
        return {
            "campaign_id": str(request.campaign_id),
            "matches_found": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))