# pyrefly: ignore [missing-import]
import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)

async def generate_explanation(campaign_context: str, influencer_data: dict, fit_score: float) -> str:
    """
    Generates a natural language explanation for an influencer match using OpenRouter.
    """
    api_key = getattr(settings, 'OPENROUTER_API_KEY', None)
    model_name = getattr(settings, 'LLM_MODEL_NAME', 'openai/gpt-3.5-turbo')

    if not api_key:
        logger.warning("OPENROUTER_API_KEY is not set. Skipping LLM explanation.")
        return "AI explanation unavailable: OPENROUTER_API_KEY is missing from environment."

    url = "https://openrouter.ai/api/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://ais-dev-pgktc545fswljxbrtbe7vd-518683714187.asia-southeast1.run.app",
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

    timeout = httpx.Timeout(15.0, connect=5.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                explanation = result["choices"][0]["message"]["content"].strip()
                return explanation
            else:
                logger.error(f"Unexpected API response format: {result}")
                return "AI explanation unavailable: Invalid response format."
            
    except httpx.HTTPStatusError as e:
        logger.error(f"OpenRouter returned status {e.response.status_code}: {e.response.text}")
        return f"AI explanation failed (HTTP {e.response.status_code}): {e.response.text}"
    except Exception as e:
        logger.error(f"OpenRouter API error during explanation generation: {e}")
        return f"AI explanation failed. Error: {str(e)}"
