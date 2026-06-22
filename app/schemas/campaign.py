from pydantic import BaseModel, Field

class CampaignRequest(BaseModel):
    niche: str = Field(..., description="e.g., productivity tech, space research")
    audience: str = Field(..., description="e.g., corporate professionals 25-40")
    budget: float = Field(..., description="Maximum budget allocation")
    target_reach: int = Field(..., description="Target audience reach constraint")
    num_results: int = Field(default=5)

    @property
    def brief_text(self) -> str:
        """Concatenates fields to create a rich context block for vector embedding."""
        return f"Niche: {self.niche}. Audience: {self.audience}."