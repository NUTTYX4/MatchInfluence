from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.middleware.cors import CORSMiddleware
# Import our infrastructure and logic
from app.database import get_db
from app.schemas.campaign import CampaignRequest, MatchRunRequest, CampaignCreate, CampaignResponse
from app.services.matching import MatchingOrchestrator
from app.config import settings
from app.db_bootstrap import ensure_database_exists

from app.core.security import get_current_user
from sqlalchemy.future import select
from app.models.campaign import Campaign
from sqlalchemy import select
from app.models.influencer import Influencer
from app.routers import auth
# Initialize the API
app = FastAPI(
    title="MatchInfluence API", 
    description="Enterprise Influencer Matching & Scoring Engine",
    version="3.0"
)

app.include_router(auth.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"], 
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
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Create a new campaign and store it in PostgreSQL.
    Returns the campaign data including the newly generated UUID.
    """
    try:
        new_campaign = Campaign(
            owner_id=current_user_id,
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
async def list_campaigns(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """Temporary endpoint to fetch all live campaign IDs."""
    result = await db.execute(select(Campaign).where(Campaign.owner_id == current_user_id))
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
async def match_influencers(
    request: MatchRunRequest, 
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    The core matching endpoint. Takes a campaign ID, fetches real details,
    queries ChromaDB, and scores them using PostgreSQL metrics.
    """
    try:
        results = await MatchingOrchestrator.find_best_matches(db, request, current_user_id)
        
        return {
            "campaign_id": str(request.campaign_id),
            "matches_found": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))