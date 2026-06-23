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