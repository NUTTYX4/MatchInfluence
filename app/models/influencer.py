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