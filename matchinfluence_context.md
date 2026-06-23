This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: app/**/*.py, **/*.json, requirements.txt
- Files matching these patterns are excluded: **/.env, **/__pycache__/**, **/.venv/**, venv/**
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
app/config.py
app/database.py
app/main.py
app/models/__init__.py
app/models/campaign.py
app/models/influencer.py
app/schemas/__init__.py
app/schemas/campaign.py
app/services/__init__.py
app/services/ai.py
app/services/data_service.py
app/services/matching.py
app/services/scoring.py
data/mock_influencers_v2.json
data/mock_influencers.json
requirements.txt
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="app/config.py">
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database Configuration
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/matchinfluence"
    CHROMA_DB_PATH: str = "./chroma_data"
    
    # API Keys (To be used in later phases)
    OPENAI_API_KEY: str = ""
    YOUTUBE_API_KEY: str = ""
    RAPIDAPI_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

# Instantiate settings to be imported across the app
settings = Settings()
</file>

<file path="app/models/__init__.py">

</file>

<file path="app/models/campaign.py">
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.influencer import Base

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    niche = Column(String(200), nullable=False)
    audience = Column(String(500), nullable=False)
    budget = Column(Float, nullable=False)
    target_reach = Column(Integer, nullable=False)
    
    # AI Tracking: Saves the exact text embedded by the HuggingFace model
    brief_text = Column(Text, nullable=True) 
    
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    # --- Relationships ---
    results = relationship("MatchResult", back_populates="campaign", cascade="all, delete-orphan")


class MatchResult(Base):
    __tablename__ = "match_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    influencer_id = Column(UUID(as_uuid=True), ForeignKey("influencers.id", ondelete="CASCADE"), nullable=False)
    rank = Column(Integer, nullable=False)

    # --- AI Score Breakdown ---
    semantic_score = Column(Float, nullable=True)
    authenticity_score = Column(Float, nullable=True)
    composite_score = Column(Float, nullable=False) # The final fit score
    cpe = Column(Float, nullable=True)
    
    # AI Tracking: Saves the natural language reasoning for why this influencer matched
    explanation = Column(Text, nullable=True) 
    
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    # --- Relationships ---
    campaign = relationship("Campaign", back_populates="results")
    influencer = relationship("Influencer", back_populates="match_results")
</file>

<file path="app/models/influencer.py">
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, BigInteger, Text, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.orm import declarative_base
Base = declarative_base()

def _utcnow() -> datetime:
    """Timezone-aware UTC timestamp factory."""
    return datetime.now(timezone.utc)

class Influencer(Base):
    __tablename__ = "influencers"

    # --- Identity ---
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(200), nullable=True)
    platform = Column(String(20), nullable=False)
    profile_url = Column(String(500), nullable=True)

    # --- Metrics ---
    follower_count = Column(Integer, default=0, nullable=False)
    following_count = Column(Integer, default=0, nullable=False)
    total_likes = Column(BigInteger, default=0, nullable=False)
    total_comments = Column(BigInteger, default=0, nullable=False)
    avg_views = Column(Integer, nullable=True)
    post_count = Column(Integer, default=0, nullable=False)

    # --- Financial ---
    estimated_cpe = Column(Float, nullable=True)
    price_per_post = Column(Float, nullable=True)

    # --- AI Context (The Brain) ---
    bio = Column(Text, nullable=True)
    recent_posts = Column(Text, nullable=True)
    niche_tags = Column(JSON, nullable=True, default=list) # Native JSON, safe for PostgreSQL
    engagement_rate = Column(Float, nullable=True)

    # --- Metadata ---
    source = Column(String(50), nullable=True)
    scraped_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    # --- Relationships ---
    match_results = relationship("MatchResult", back_populates="influencer", cascade="all, delete-orphan")
</file>

<file path="app/schemas/__init__.py">

</file>

<file path="app/schemas/campaign.py">
from pydantic import BaseModel, Field, field_validator

class CampaignRequest(BaseModel):
    niche: str = Field(..., description="e.g., productivity tech, space research")
    audience: str = Field(..., description="e.g., corporate professionals 25-40")
    budget: float = Field(..., description="Maximum budget allocation")
    target_reach: int = Field(..., description="Target audience reach constraint")
    num_results: int = Field(default=5, ge=1, le=50)

    @field_validator('budget')
    @classmethod
    def validate_budget(cls, v):
        if v <= 0:
            raise ValueError("Budget must be greater than 0")
        return v

    @field_validator('target_reach')
    @classmethod
    def validate_reach(cls, v):
        if v <= 0:
            raise ValueError("Target reach must be greater than 0")
        return v

    @property
    def brief_text(self) -> str:
        """Concatenates fields to create a rich context block for vector embedding."""
        return f"Niche: {self.niche}. Audience: {self.audience}."
</file>

<file path="app/services/__init__.py">

</file>

<file path="app/services/ai.py">
import asyncio
from sentence_transformers import SentenceTransformer

# Load the model into memory. 
# 'all-MiniLM-L6-v2' is fast, free, and produces 384-dimensional vectors 
# which perfectly matches ChromaDB's default space.
print("Loading HuggingFace AI Model... (This may take a few seconds on the first run)")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("AI Model Loaded Successfully!")

class AIEngine:
    @staticmethod
    def _get_embedding_sync(text: str) -> list[float]:
        """Synchronous internal method for HuggingFace model encoding."""
        return model.encode(text).tolist()

    @staticmethod
    async def get_embedding(text: str) -> list[float]:
        """
        Reads English text and converts its semantic meaning 
        into a 384-dimensional mathematical coordinate.
        Runs in a background thread to prevent blocking the FastAPI event loop.
        """
        # Offload the heavy CPU-bound task to a separate thread
        return await asyncio.to_thread(AIEngine._get_embedding_sync, text)
</file>

<file path="app/services/data_service.py">
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.influencer import Influencer
from app.database import chroma_collection

class DataIngestionService:
    @staticmethod
    async def save_influencer(db: AsyncSession, influencer_data: dict, embedding: list[float]) -> Influencer:
        """
        Atomically saves structural data to PostgreSQL and semantic vectors to ChromaDB.
        """
        # 1. Check if the influencer already exists to avoid duplicate entries
        query = select(Influencer).where(Influencer.username == influencer_data["username"])
        result = await db.execute(query)
        existing_influencer = result.scalar_one_or_none()
        
        if existing_influencer:
            return existing_influencer

        # 2. Generate a single unified UUID shared across both databases
        shared_uuid = str(uuid.uuid4())
        
        # 3. Formulate the PostgreSQL structured record
        db_influencer = Influencer(
            id=shared_uuid,
            username=influencer_data["username"],
            full_name=influencer_data.get("full_name"),
            platform=influencer_data["platform"],
            profile_url=influencer_data.get("profile_url"),
            follower_count=influencer_data.get("follower_count", 0),
            following_count=influencer_data.get("following_count", 0),
            total_likes=influencer_data.get("total_likes", 0),
            total_comments=influencer_data.get("total_comments", 0),
            avg_views=influencer_data.get("avg_views"),
            post_count=influencer_data.get("post_count", 0),
            price_per_post=influencer_data.get("price_per_post"),
            bio=influencer_data.get("bio"),
            recent_posts=influencer_data.get("recent_posts"),
            niche_tags=influencer_data.get("niche_tags", []),
            source=influencer_data["source"]
        )
        
        # Calculate initial baseline engagement rate
        if db_influencer.follower_count > 0:
            total_engagements = db_influencer.total_likes + db_influencer.total_comments
            db_influencer.engagement_rate = float(total_engagements / db_influencer.follower_count)

        # 4. Write to PostgreSQL
        db.add(db_influencer)
        await db.commit()
        await db.refresh(db_influencer)
        
        # 5. Compile semantic metadata block for ChromaDB search display
        semantic_document = f"Bio: {db_influencer.bio or ''} Recent Posts: {db_influencer.recent_posts or ''}"
        
        # 6. Write to ChromaDB using the exact same ID string
        chroma_collection.add(
            ids=[shared_uuid],
            embeddings=[embedding],
            documents=[semantic_document],
            metadatas=[{
                "username": db_influencer.username,
                "platform": db_influencer.platform,
                "niche_tags": ",".join(db_influencer.niche_tags) if db_influencer.niche_tags else ""
            }]
        )
        
        return db_influencer
</file>

<file path="app/services/matching.py">
import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.influencer import Influencer
from app.models.campaign import Campaign, MatchResult
from app.database import chroma_collection
from app.services.scoring import ScoringEngine
from app.services.ai import AIEngine  # <--- NEW AI IMPORT

logger = logging.getLogger(__name__)

class MatchingOrchestrator:
    
    @staticmethod
    async def find_best_matches(db: AsyncSession, campaign_req):
        try:
            # 1. Compile the semantic text
            brief_text = f"Niche: {campaign_req.niche}. Audience: {campaign_req.audience}."

            # 2. PERSIST: Save the initial Campaign Request
            db_campaign = Campaign(
                niche=campaign_req.niche,
                audience=campaign_req.audience,
                budget=campaign_req.budget,
                target_reach=campaign_req.target_reach,
                brief_text=brief_text  # Saving the exact text the AI reads
            )
            db.add(db_campaign)
            await db.flush() 
            
            # 3. AI VECTOR EMBEDDING (Now properly awaited and offloaded to a thread)
            query_vector = await AIEngine.get_embedding(brief_text)
            
            # 4. Vector Search via ChromaDB
            chroma_results = chroma_collection.query(
                query_embeddings=[query_vector],
                n_results=campaign_req.num_results
            )
            
            if not chroma_results['ids'] or not chroma_results['ids'][0]:
                await db.commit() 
                return []

            matched_uuids = chroma_results['ids'][0]
            semantic_distances = chroma_results['distances'][0]
            
            # 5. HYDRATE: Fetch exact rows from PostgreSQL
            query = select(Influencer).where(Influencer.id.in_(matched_uuids))
            db_results = await db.execute(query)
            influencers_dict = {str(inf.id): inf for inf in db_results.scalars().all()}
            
            final_candidates = []
            
            # 6. SCORE: Run math pipeline
            for i, inf_id in enumerate(matched_uuids):
                inf = influencers_dict.get(inf_id)
                if not inf:
                    continue
                    
                distance = semantic_distances[i]
                semantic_score = max(0.0, 1.0 - (distance / 2.0))
                
                metrics = ScoringEngine.calculate_metrics(
                    inf.follower_count, inf.following_count, inf.total_likes, inf.total_comments
                )
                
                auth_score = ScoringEngine.calculate_authenticity(
                    metrics['er'], metrics['clr'], metrics['ffr'], inf.platform
                )
                fit_score = ScoringEngine.calculate_composite_fit(semantic_score, auth_score)
                
                expected_engagements = max(inf.follower_count * (metrics['er'] / 100), 1)
                cpe = (inf.price_per_post / expected_engagements) if inf.price_per_post else 0.0
                
                # Temporary AI Explanation string (Will be powered by LLM in Phase 3)
                temp_explanation = f"Matches campaign with a {round(semantic_score * 100)}% semantic confidence."

                final_candidates.append({
                    "influencer_id": inf_id,  
                    "influencer": {
                        "username": inf.username,
                        "platform": inf.platform,
                        "followers": inf.follower_count,
                        "price": inf.price_per_post
                    },
                    "metrics": metrics,
                    "scores": {
                        "semantic_match": round(semantic_score, 3),
                        "authenticity": auth_score,
                        "composite_fit": fit_score
                    },
                    "financials": {
                        "cpe": round(cpe, 4)
                    },
                    "explanation": temp_explanation
                })
                
            # 7. RANK: Sort by highest Composite Fit Score
            final_candidates.sort(key=lambda x: x["scores"]["composite_fit"], reverse=True)
            
            # 8. PERSIST: Save the MatchResult records to PostgreSQL
            for rank_index, candidate in enumerate(final_candidates):
                db_match = MatchResult(
                    campaign_id=db_campaign.id,
                    influencer_id=candidate["influencer_id"],
                    semantic_score=candidate["scores"]["semantic_match"],
                    authenticity_score=candidate["scores"]["authenticity"],
                    composite_score=candidate["scores"]["composite_fit"],
                    cpe=candidate["financials"]["cpe"],
                    explanation=candidate["explanation"],
                    rank=rank_index + 1
                )
                db.add(db_match)
                
                del candidate["influencer_id"]

            # 9. COMMIT: Execute all database writes atomically
            await db.commit()
            
            return final_candidates
            
        except Exception as e:
            # 10. ROLLBACK: Catch any DB or math failures to prevent desynchronization
            logger.error(f"Matching pipeline encountered an error: {str(e)}. Rolling back transaction.")
            await db.rollback()
            raise e
</file>

<file path="app/services/scoring.py">
import math

class ScoringEngine:
    
    @staticmethod
    def calculate_metrics(followers: int, following: int, likes: int, comments: int) -> dict:
        """Calculates raw ER, CLR, and FFR metrics safely handling zero-division."""
        followers = max(followers, 1) # Prevent DivisionByZero
        likes = max(likes, 0)
        comments = max(comments, 0)
        following = max(following, 1)

        er = ((likes + comments) / followers) * 100
        clr = (comments / likes) if likes > 0 else 0.0
        ffr = followers / following

        return {
            "er": round(er, 2),
            "clr": round(clr, 4),
            "ffr": round(ffr, 2)
        }

    @staticmethod
    def calculate_authenticity(er: float, clr: float, ffr: float, platform: str) -> float:
        """
        Calculates the Authenticity Score using sigmoid normalization.
        Weights: ER (50%), CLR (30%), FFR (20%)
        """
        # 1. Normalize ER based on platform benchmarks (Instagram ~3%, YouTube ~4%)
        er_benchmark = 3.5 if platform == "youtube" else 3.0
        norm_er = 1 / (1 + math.exp(-1.5 * (er - er_benchmark)))

        # 2. Normalize CLR (Healthy organic CLR is usually between 0.02 and 0.08)
        # We heavily penalize CLR < 0.01 (bot territory)
        if clr < 0.01:
            norm_clr = 0.1  # Severe penalty
        elif clr > 0.15:
            norm_clr = 0.8  # Good, but diminishing returns for extreme outlier comments
        else:
            # Scale linearly between 0.01 and 0.15
            norm_clr = (clr - 0.01) / 0.14 

        # 3. Normalize FFR (Authority metric)
        # FFR < 1 means they follow more people than follow them (Spam behavior)
        if ffr < 1.0:
            norm_ffr = 0.0
        elif ffr > 50.0:
            norm_ffr = 1.0 # Max authority
        else:
            norm_ffr = math.log10(ffr) / math.log10(50.0)

        # 4. Apply Weights
        w_er, w_clr, w_ffr = 0.50, 0.30, 0.20
        authenticity_score = (w_er * norm_er) + (w_clr * norm_clr) + (w_ffr * norm_ffr)

        return round(authenticity_score, 3)

    @staticmethod
    def calculate_composite_fit(semantic_score: float, authenticity_score: float) -> float:
        """
        Combines vector semantic similarity with the mathematical authenticity score.
        Fit = (0.6 * Semantic) + (0.4 * Authenticity)
        """
        alpha, beta = 0.6, 0.4
        fit_score = (alpha * semantic_score) + (beta * authenticity_score)
        return round(fit_score, 3)
</file>

<file path="data/mock_influencers_v2.json">
[
  {
    "username": "robotic_maker",
    "full_name": "Alex Hardware",
    "platform": "youtube",
    "follower_count": 125000,
    "following_count": 450,
    "total_likes": 850000,
    "total_comments": 42000,
    "avg_views": 65000,
    "post_count": 120,
    "price_per_post": 1500.00,
    "bio": "Building IoT systems, automated sludge management robots, and AI-driven hardware.",
    "recent_posts": "Wiring L298N drivers. 1000rpm geared motors in action. AI command logic for environmental analysis.",
    "niche_tags": ["robotics", "iot", "engineering"],
    "source": "manual_seed"
  },
  {
    "username": "api_apiculture",
    "full_name": "Sarah Hives",
    "platform": "instagram",
    "follower_count": 45000,
    "following_count": 300,
    "total_likes": 120000,
    "total_comments": 5000,
    "post_count": 340,
    "price_per_post": 400.00,
    "bio": "Smart apiculture and environmental tech. Monitoring hive health with acoustics.",
    "recent_posts": "Raspberry Pi Zero 2W setup. Multi-sensor frameworks for bees. Patent pending tech reveals.",
    "niche_tags": ["sustainability", "iot", "nature"],
    "source": "manual_seed"
  },
  {
    "username": "space_impact",
    "full_name": "Dr. Elena Vance",
    "platform": "youtube",
    "follower_count": 310000,
    "following_count": 120,
    "total_likes": 2100000,
    "total_comments": 85000,
    "avg_views": 150000,
    "post_count": 85,
    "price_per_post": 3500.00,
    "bio": "Astrophysics and hypervelocity impact research. Building detection prototypes.",
    "recent_posts": "Piezoelectric vibration sensors tested. Classifying impact intensities. Procurement guides for MIDS.",
    "niche_tags": ["space", "science", "research"],
    "source": "manual_seed"
  },
  {
    "username": "code_ghost",
    "full_name": "Marcus Dev",
    "platform": "linkedin",
    "follower_count": 85000,
    "following_count": 1200,
    "total_likes": 45000,
    "total_comments": 3200,
    "post_count": 210,
    "price_per_post": 800.00,
    "bio": "Android Kotlin developer. Focusing on mobile privacy and telecom APIs.",
    "recent_posts": "Implementing CallScreeningService API. Building ghost modes for Samsung devices. SMS auto-replies.",
    "niche_tags": ["software", "android", "privacy"],
    "source": "manual_seed"
  },
  {
    "username": "3d_print_master",
    "full_name": "Chloe Layer",
    "platform": "instagram",
    "follower_count": 275000,
    "following_count": 800,
    "total_likes": 1500000,
    "total_comments": 110000,
    "post_count": 650,
    "price_per_post": 2200.00,
    "bio": "Mechanical design and additive manufacturing. Pushing filaments to the limit.",
    "recent_posts": "Bambu Lab X1 Carbon slicing settings. Troubleshooting TPU. Designing functional 3D models in Fusion 360.",
    "niche_tags": ["3dprinting", "design", "hardware"],
    "source": "manual_seed"
  },
  {
    "username": "corporate_hacker",
    "full_name": "David Chen",
    "platform": "linkedin",
    "follower_count": 15000,
    "following_count": 500,
    "total_likes": 8000,
    "total_comments": 900,
    "post_count": 45,
    "price_per_post": 300.00,
    "bio": "Enterprise software architecture and tech career growth.",
    "recent_posts": "How to scale PostgreSQL. Navigating corporate tech ladders. System design interview prep.",
    "niche_tags": ["career", "software", "enterprise"],
    "source": "manual_seed"
  },
  {
    "username": "vr_innovator",
    "full_name": "Maya Singh",
    "platform": "youtube",
    "follower_count": 58000,
    "following_count": 200,
    "total_likes": 320000,
    "total_comments": 15000,
    "avg_views": 25000,
    "post_count": 95,
    "price_per_post": 600.00,
    "bio": "Immersive technology, AR/VR experiences, and hackathon strategies.",
    "recent_posts": "Hosting InnovateX 4.0. Project showcase requirements for AR. Building immersive tech.",
    "niche_tags": ["ar", "vr", "gaming"],
    "source": "manual_seed"
  },
  {
    "username": "bot_farmer_99",
    "full_name": "Crypto King",
    "platform": "instagram",
    "follower_count": 950000,
    "following_count": 15000,
    "total_likes": 12000,
    "total_comments": 50,
    "post_count": 1200,
    "price_per_post": 5000.00,
    "bio": "100x your returns. DM for signals. Luxury lifestyle.",
    "recent_posts": "Buy the dip. Lambo delivered. Passive income secrets.",
    "niche_tags": ["crypto", "finance", "luxury"],
    "source": "manual_seed"
  },
  {
    "username": "daily_focus",
    "full_name": "Emma Woods",
    "platform": "instagram",
    "follower_count": 110000,
    "following_count": 850,
    "total_likes": 400000,
    "total_comments": 18000,
    "post_count": 420,
    "price_per_post": 950.00,
    "bio": "Productivity routines and workspace setups for professionals.",
    "recent_posts": "My 5AM routine. Desk organization tips. Best mechanical keyboards for typing.",
    "niche_tags": ["productivity", "lifestyle", "tech"],
    "source": "manual_seed"
  },
  {
    "username": "mobile_pro_gamer",
    "full_name": "Tyler FPS",
    "platform": "youtube",
    "follower_count": 890000,
    "following_count": 55,
    "total_likes": 4500000,
    "total_comments": 210000,
    "avg_views": 400000,
    "post_count": 310,
    "price_per_post": 7500.00,
    "bio": "Mobile gaming esports. Call of Duty: Mobile strategies and high-end device benchmarking.",
    "recent_posts": "Pro sensitivity settings. Testing the Samsung S24 FE performance. Tournament highlights.",
    "niche_tags": ["gaming", "esports", "mobile"],
    "source": "manual_seed"
  },
  {
    "username": "fit_engineer",
    "full_name": "Jordan Cole",
    "platform": "instagram",
    "follower_count": 65000,
    "following_count": 400,
    "total_likes": 180000,
    "total_comments": 6000,
    "post_count": 280,
    "price_per_post": 500.00,
    "bio": "Balancing a tech career with weightlifting. Evidence-based fitness.",
    "recent_posts": "Meal prep for developers. Squat form analysis. How to avoid desk posture.",
    "niche_tags": ["fitness", "health", "lifestyle"],
    "source": "manual_seed"
  },
  {
    "username": "data_viz_art",
    "full_name": "Lisa Ray",
    "platform": "linkedin",
    "follower_count": 34000,
    "following_count": 600,
    "total_likes": 25000,
    "total_comments": 2100,
    "post_count": 150,
    "price_per_post": 450.00,
    "bio": "Turning Python data processing scripts into visual art. Data science simplified.",
    "recent_posts": "Matplotlib tricks. Cleaning datasets with Pandas. Communicating data to executives.",
    "niche_tags": ["data", "python", "art"],
    "source": "manual_seed"
  },
  {
    "username": "startup_incubator",
    "full_name": "Dr. Kiran",
    "platform": "linkedin",
    "follower_count": 42000,
    "following_count": 1800,
    "total_likes": 15000,
    "total_comments": 1200,
    "post_count": 400,
    "price_per_post": 800.00,
    "bio": "Mentoring student founders. Focusing on multidisciplinary innovation and IP creation.",
    "recent_posts": "Shifting from basic projects to pre-incubation. How to file a patent. Building intellectual property.",
    "niche_tags": ["education", "startups", "research"],
    "source": "manual_seed"
  },
  {
    "username": "indie_web_dev",
    "full_name": "Samira Web",
    "platform": "youtube",
    "follower_count": 155000,
    "following_count": 200,
    "total_likes": 600000,
    "total_comments": 28000,
    "avg_views": 80000,
    "post_count": 180,
    "price_per_post": 1200.00,
    "bio": "HTML, CSS, JavaScript tutorials. Building responsive IoT cloud dashboards.",
    "recent_posts": "Real-time data visualization on the web. Connecting ESP32 to web interfaces. CSS Grid mastery.",
    "niche_tags": ["webdev", "programming", "iot"],
    "source": "manual_seed"
  },
  {
    "username": "custom_ui_fanatic",
    "full_name": "Ryan Theme",
    "platform": "instagram",
    "follower_count": 28000,
    "following_count": 150,
    "total_likes": 90000,
    "total_comments": 3000,
    "post_count": 110,
    "price_per_post": 250.00,
    "bio": "Making your tech look beautiful. Custom UI setups.",
    "recent_posts": "Samsung Good Lock customization tips. Nova Launcher setups. Minimalist home screens.",
    "niche_tags": ["design", "mobile", "customization"],
    "source": "manual_seed"
  }
]
</file>

<file path="data/mock_influencers.json">
[
  {
    "id": 1,
    "username": "corporate_pro_rohan",
    "full_name": "Rohan Sharma",
    "platform": "linkedin",
    "follower_count": 45000,
    "engagement_rate": 4.2,
    "bio": "Optimizing corporate life & modern menswear. Ex-Consultant. I help young executives build productivity systems.",
    "recent_posts": "Time management is the ultimate luxury. Boardroom style shouldn't be loud; it should be subtle and efficient. Here are 3 tools for daily productivity."
  },
  {
    "id": 2,
    "username": "delhi_foodie_diaries",
    "full_name": "Priya Singh",
    "platform": "instagram",
    "follower_count": 85000,
    "engagement_rate": 5.5,
    "bio": "Exploring the best street food and cafes in India. Food reviews and hidden gems.",
    "recent_posts": "You have to try this spicy chaat in Old Delhi! The presentation at this new cafe is amazing. Best desserts in town."
  }
]
</file>

<file path="requirements.txt">
fastapi==0.110.0
uvicorn==0.30.1
chromadb==0.4.24
openai==1.14.0
pydantic==2.6.4
python-dotenv==1.0.1
numpy==1.26.4
</file>

<file path="app/database.py">
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
</file>

<file path="app/main.py">
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
</file>

</files>
