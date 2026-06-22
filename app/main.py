from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

# Import our infrastructure and logic
from app.database import get_db
from app.schemas.campaign import CampaignRequest
from app.services.matching import MatchingOrchestrator

# Initialize the API
app = FastAPI(
    title="MatchInfluence API", 
    description="Enterprise Influencer Matching & Scoring Engine",
    version="2.0"
)

@app.get("/")
async def health_check():
    """Confirms the API is online."""
    return {"status": "online", "message": "MatchInfluence Engine V2 is running."}

@app.post("/match")
async def match_influencers(campaign: CampaignRequest, db: AsyncSession = Depends(get_db)):
    """
    The core matching endpoint. Takes a campaign brief, queries ChromaDB for 
    semantic matches, and scores them using PostgreSQL metrics.
    """
    try:
        results = await MatchingOrchestrator.find_best_matches(db, campaign)
        
        return {
            "campaign_context": campaign.brief_text,
            "budget_constraint": f"${campaign.budget}",
            "matches_found": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))