from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

# Infrastructure and Models
from app.database import get_db
from app.config import settings
from app.db_bootstrap import ensure_database_exists
from app.core.security import get_current_user
from app.models.campaign import Campaign, MatchResult  # Fixed: Imported MatchResult
from app.models.influencer import Influencer
from app.routers import auth

# Schemas and Services
from app.schemas.campaign import (
    CampaignRequest, 
    MatchRunRequest, 
    CampaignCreate, 
    CampaignResponse, 
    CampaignGenerateRequest, 
    AnalyzeBriefRequest, 
    AnalyzeBriefResponse
)
from app.services.matching import MatchingOrchestrator
from app.services.llm import extract_campaign_parameters, analyze_brief_intent
from app.services.data_scraper.scraper import IngestionScraperEngine

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

@app.post("/campaigns/analyze", response_model=AnalyzeBriefResponse, status_code=status.HTTP_200_OK)
async def analyze_campaign_brief(
    request: AnalyzeBriefRequest,
    current_user_id: str = Depends(get_current_user)
):
    """
    Analyzes a brief and returns missing parameters and suggestions.
    Does not save to database.
    """
    try:
        extracted = await analyze_brief_intent(request.prompt)
        return extracted
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze brief: {str(e)}"
        )

@app.post("/campaigns/generate", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def generate_campaign(
    request: CampaignGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Takes a natural language prompt, uses an LLM to extract campaign parameters,
    creates the campaign in the database, and returns it.
    """
    try:
        # 1. Extract parameters using LLM
        extracted = await extract_campaign_parameters(request.prompt)
        
        # 2. Create database record
        new_campaign = Campaign(
            owner_id=current_user_id,
            niche=extracted["niche"],
            audience=extracted["audience"],
            budget=extracted["budget"],
            target_reach=extracted["target_reach"],
            brief_text=request.prompt,
        )
        
        db.add(new_campaign)
        await db.commit()
        await db.refresh(new_campaign)
        
        return new_campaign
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate campaign: {str(e)}"
        )

@app.get("/campaigns")
async def list_campaigns(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """Fetch all live campaign IDs for current user."""
    result = await db.execute(select(Campaign).where(Campaign.owner_id == current_user_id))
    campaigns = result.scalars().all()
    return [{"id": str(c.id), "niche": c.niche, "budget": c.budget} for c in campaigns]


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


@app.get("/campaigns/{campaign_id}/analytics")
async def get_campaign_analytics(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Analytics & Workspace Tracking Memory aggregation endpoint.
    Returns pre-shaped payloads for charts and historical tracking.
    """
    # Security & Ownership Check
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.owner_id == current_user_id)
    )
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    # Query & Join Optimization
    result = await db.execute(
        select(MatchResult)
        .where(MatchResult.campaign_id == campaign_id)
        .options(selectinload(MatchResult.influencer))
        .order_by(MatchResult.created_at.desc())
    )
    match_results = result.scalars().all()
    
    # Aggregate & Shape Output Payload
    fit_authenticity_map = []
    cpe_ranking_temp = []
    history_logs = []
    
    for mr in match_results:
        influencer = mr.influencer
        if not influencer:
            continue
            
        fit_authenticity_map.append({
            "username": influencer.username,
            "platform": influencer.platform,
            "x_authenticity": mr.authenticity_score,
            "y_composite_fit": mr.composite_score,
            "z_reach": influencer.follower_count
        })
        
        cpe_ranking_temp.append({
            "username": influencer.username,
            "platform": influencer.platform,
            "cpe": mr.cpe,
            "followers": influencer.follower_count
        })
        
        history_logs.append({
            "match_id": str(mr.id),
            "username": influencer.username,
            "platform": influencer.platform,
            "rank": mr.rank,
            "composite_score": mr.composite_score,
            "authenticity_score": mr.authenticity_score,
            "semantic_score": mr.semantic_score,
            "cpe": mr.cpe,
            "created_at": mr.created_at.isoformat() if mr.created_at else None
        })
        
    # Sort cpe_ranking by cpe ascending (nulls/zeros last)
    def cpe_sort_key(item):
        val = item["cpe"]
        if val is None or val == 0:
            return float('inf')
        return val
        
    cpe_ranking = sorted(cpe_ranking_temp, key=cpe_sort_key)
    
    return {
        "campaign_id": str(campaign_id),
        "fit_authenticity_map": fit_authenticity_map,
        "cpe_ranking": cpe_ranking,
        "history_logs": history_logs
    }