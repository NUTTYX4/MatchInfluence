from pydantic import BaseModel, Field, field_validator
from uuid import UUID

class CampaignRequest(BaseModel):
    niche: str = Field(default="General", description="e.g., productivity tech, space research")
    audience: str = Field(default="General Audience", description="e.g., corporate professionals 25-40")
    budget: float = Field(default=1.0, description="Maximum budget allocation")
    target_reach: int = Field(default=1, description="Target audience reach constraint")
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

class CampaignCreate(BaseModel):
    niche: str = Field(default="General", description="e.g., productivity tech, space research")
    audience: str = Field(default="General Audience", description="e.g., corporate professionals 25-40")
    budget: float = Field(default=1.0, description="Maximum budget allocation")
    target_reach: int = Field(default=1, description="Target audience reach constraint")

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

class CampaignResponse(BaseModel):
    id: UUID
    niche: str
    audience: str
    budget: float
    target_reach: int
    brief_text: str | None

    class Config:
        from_attributes = True

class MatchRunRequest(BaseModel):
    """Clean payload for running the AI engine against an existing campaign."""
    campaign_id: UUID
    num_results: int = Field(default=5, ge=1, le=50)

class AnalyzeBriefRequest(BaseModel):
    prompt: str = Field(..., description="User's natural language input for campaign generation")

from typing import Optional, List, Dict

class AnalyzeBriefResponse(BaseModel):
    niche: Optional[str] = None
    audience: Optional[str] = None
    budget: Optional[float] = None
    target_reach: Optional[int] = None
    missing_fields: List[str] = []
    suggestions: Dict[str, List[str]] = {}
    is_complete: bool = False

class CampaignGenerateRequest(BaseModel):
    prompt: str = Field(..., description="User's natural language input for campaign generation")

class CampaignExtractedData(BaseModel):
    niche: str
    audience: str
    budget: float
    target_reach: int
