# pyrefly: ignore [missing-import]
import asyncio
import httpx
import logging
from app.config import settings

# pyrefly: ignore [missing-import]
import asyncio
import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)

async def generate_explanation(campaign_context: str, influencer_data: dict, fit_score: float) -> str:
    """
    Generates a natural language explanation for an influencer match using OpenRouter.
    """
    api_key = getattr(settings, 'LLM_API_KEY', None)
    base_url = getattr(settings, 'LLM_BASE_URL', 'https://models.inference.ai.azure.com')
    model_name = getattr(settings, 'LLM_MODEL_NAME', 'gpt-4o-mini')

    if not api_key:
        logger.warning("LLM_API_KEY is not set. Skipping LLM explanation.")
        return "AI explanation unavailable: LLM_API_KEY is missing from environment."

    url = f"{base_url.rstrip('/')}/chat/completions"
    
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
    max_retries = 3
    base_backoff = 2.0

    for attempt in range(max_retries + 1):
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
            if e.response.status_code == 429 and attempt < max_retries:
                retry_after = e.response.headers.get("Retry-After")
                if retry_after and retry_after.isdigit():
                    delay = int(retry_after)
                else:
                    # Exponential backoff: 2s, 4s, 8s
                    delay = base_backoff * (2 ** attempt)
                
                logger.warning(f"LLM Provider rate limit hit (429). Retrying in {delay}s (Attempt {attempt + 1}/{max_retries})...")
                await asyncio.sleep(delay)
                continue
                
            logger.error(f"LLM Provider returned status {e.response.status_code}: {e.response.text}")
            return f"AI explanation failed (HTTP {e.response.status_code}): {e.response.text}"
            
        except Exception as e:
            logger.error(f"LLM Provider API error during explanation generation: {e}")
            return f"AI explanation failed. Error: {str(e)}"
