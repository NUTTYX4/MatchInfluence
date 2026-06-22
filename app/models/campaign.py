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