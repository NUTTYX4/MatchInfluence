from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.middleware.cors import CORSMiddleware
# Import our infrastructure and logic
from app.database import get_db
from app.schemas.campaign import CampaignRequest, MatchRunRequest, CampaignCreate, CampaignResponse
from app.services.matching import MatchingOrchestrator
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

@app.get("/")
async def health_check():
    """Confirms the API is online."""
    return {"status": "online", "message": "MatchInfluence Engine V3 is running."}


@app.post("/campaigns", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    campaign_in: CampaignCreate, 
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new campaign and store it in PostgreSQL.
    Returns the campaign data including the newly generated UUID.
    """
    try:
        new_campaign = Campaign(
            niche=campaign_in.niche,
            audience=campaign_in.audience,
            budget=campaign_in.budget,
            target_reach=campaign_in.target_reach,
            brief_text=campaign_in.brief_text,
        )
        
        db.add(new_campaign)
        await db.commit()
        await db.refresh(new_campaign)
        
        return new_campaign
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create campaign: {str(e)}"
        )

@app.get("/campaigns")
async def list_campaigns(db: AsyncSession = Depends(get_db)):
    """Temporary endpoint to fetch all live campaign IDs."""
    result = await db.execute(select(Campaign))
    campaigns = result.scalars().all()
    return [{"id": str(c.id), "niche": c.niche, "budget": c.budget} for c in campaigns]

from pydantic import BaseModel
from app.services.data_scraper.scraper import IngestionScraperEngine

class IngestRequest(BaseModel):
    target_id: str
    platform: str

@app.post("/influencers/ingest")
async def ingest_influencer(request: IngestRequest, db: AsyncSession = Depends(get_db)):
    """Ingest a new influencer profile live from an external platform."""
    try:
        influencer_id = await IngestionScraperEngine.coordinate_live_ingestion(
            db, request.target_id, request.platform
        )
        return {"status": "success", "influencer_id": influencer_id}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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