import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)

async def generate_explanation(campaign_context: str, influencer_data: dict, fit_score: float) -> str:
    """
    Generates a natural language explanation for an influencer match using OpenRouter.
    """
    # Dynamically pull the API key and model name, falling back to None and a default respectively
    api_key = getattr(settings, 'OPENROUTER_API_KEY', None)
    model_name = getattr(settings, 'LLM_MODEL_NAME', 'openai/gpt-3.5-turbo')

    # Graceful degradation if keys are completely missing from configuration
    if not api_key:
        logger.warning("OPENROUTER_API_KEY is not set. Skipping LLM explanation generation.")
        return "AI explanation temporarily unavailable."

    url = "https://openrouter.ai/api/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "http://localhost",  # Change to your actual production domain
        "X-Title": "MatchInfluence",
        "Content-Type": "application/json"
    }

    system_prompt = (
        "You are an expert marketing analyst. Explain exactly why this specific influencer "
        "is a strong match for the given campaign brief. Keep your response to 2-3 concise, "
        "professional sentences. Focus on audience alignment and content relevance."
    )

    user_prompt = (
        f"Campaign Context: {campaign_context}\n"
        f"Influencer Profile: {influencer_data}\n"
        f"Overall Fit Score: {fit_score * 100:.1f}%"
    )

    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    }

    try:
        # Use httpx.AsyncClient to ensure we don't block the FastAPI event loop
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            result = response.json()
            explanation = result["choices"][0]["message"]["content"].strip()
            return explanation
            
    except Exception as e:
        # Fallback mechanism so the matching pipeline never crashes
        logger.error(f"OpenRouter API error during explanation generation: {e}")
        return "AI explanation temporarily unavailable."