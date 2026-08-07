import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.influencer import Base

def _utcnow() -> datetime:
    """Timezone-aware UTC timestamp factory."""
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=True, default="Valued Creator")
    company_or_agency = Column(String(200), nullable=True)
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    # --- Relationships ---
    campaigns = relationship("Campaign", back_populates="owner", cascade="all, delete-orphan")
