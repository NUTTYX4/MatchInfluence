from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.middleware.cors import CORSMiddleware
# Import our infrastructure and logic
from app.database import get_db
from app.schemas.campaign import CampaignRequest, MatchRunRequest
from app.services.matching import MatchingOrchestrator
from seed_db import seed_database
from app.config import settings
from app.db_bootstrap import ensure_database_exists

from sqlalchemy.future import select
from app.models.campaign import Campaign
from sqlalchemy import select
from app.models.influencer import Influencer
# Initialize the API
app = FastAPI(
    title="MatchInfluence API", 
    description="Enterprise Influencer Matching & Scoring Engine",
    version="3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/seed")
async def seed_db_endpoint(background_tasks: BackgroundTasks):
    """Seed the database with mock data. Runs in the background."""
    async def run_seed():
        await ensure_database_exists(settings.DATABASE_URL)
        await seed_database()
    background_tasks.add_task(run_seed)
    return {"message": "Seeding started in the background. Check terminal/logs for progress."}

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

@app.get("/influencers")
async def get_influencers(db: AsyncSession = Depends(get_db)):
    """List all influencers in the PostgreSQL database."""
    result = await db.execute(select(Influencer))
    influencers = result.scalars().all()
    return influencers

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