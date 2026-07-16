import httpx
import logging
import json
from app.config import settings

logger = logging.getLogger(__name__)

async def analyze_brief_intent(user_prompt: str) -> dict:
    """
    Analyzes a brief prompt and attempts to extract campaign parameters,
    determines missing fields, and provides smart suggestions.
    """
    api_key = getattr(settings, 'LLM_API_KEY', None)
    model_name = getattr(settings, 'LLM_MODEL_NAME', 'gpt-4o-mini')
    base_url = getattr(settings, 'LLM_BASE_URL', 'https://models.github.ai/inference').rstrip('/')

    if not api_key:
        logger.warning("LLM_API_KEY is not set. Using fallback analysis.")
        return {
            "niche": None,
            "audience": None,
            "budget": None,
            "target_reach": None,
            "missing_fields": ["niche", "audience", "budget", "target_reach"],
            "suggestions": {
                "niche": ["Tech Reviews", "Fitness", "Gaming"],
                "audience": ["Gen Z", "Corporate Professionals"],
                "budget": ["5000", "10000"],
                "target_reach": ["50000", "100000"]
            },
            "is_complete": False
        }

    url = f"{base_url}/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    system_prompt = (
        "You are an expert campaign configuration assistant. "
        "Analyze the user's brief and extract values for niche (string), audience (string), budget (number), and target_reach (integer). "
        "If budget or target_reach are described in text (e.g. 'ten grand'), convert them to numeric values. "
        "If any of these 4 fields are missing or unclear, include their names in the 'missing_fields' array and set their value to null. "
        "For each missing field, provide 2-3 highly relevant, context-aware suggestions in a 'suggestions' object mapping field name to a list of suggested strings. "
        "Also include an 'is_complete' boolean flag that is true ONLY if all 4 fields are extracted successfully without being missing. "
        "Return ONLY a JSON object exactly matching this structure: {\"niche\": \"...\" or null, \"audience\": \"...\" or null, \"budget\": 1000 or null, \"target_reach\": 5000 or null, \"missing_fields\": [], \"suggestions\": {}, \"is_complete\": true/false}."
    )

    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "response_format": {"type": "json_object"}
    }

    timeout = httpx.Timeout(15.0, connect=5.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"].strip()
                extracted_data = json.loads(content)
                
                return {
                    "niche": extracted_data.get("niche"),
                    "audience": extracted_data.get("audience"),
                    "budget": extracted_data.get("budget"),
                    "target_reach": extracted_data.get("target_reach"),
                    "missing_fields": extracted_data.get("missing_fields", []),
                    "suggestions": extracted_data.get("suggestions", {}),
                    "is_complete": extracted_data.get("is_complete", False)
                }
            else:
                logger.error(f"Unexpected API response format: {result}")
    except Exception as e:
        logger.error(f"LLM API error during brief analysis: {e}")
        
    return {
        "niche": None,
        "audience": None,
        "budget": None,
        "target_reach": None,
        "missing_fields": ["niche", "audience", "budget", "target_reach"],
        "suggestions": {},
        "is_complete": False
    }

async def extract_campaign_parameters(user_prompt: str) -> dict:
    """
    Extracts structured campaign data from a natural language prompt.
    Returns a dict matching CampaignExtractedData schema.
    """
    api_key = getattr(settings, 'LLM_API_KEY', None)
    model_name = getattr(settings, 'LLM_MODEL_NAME', 'gpt-4o-mini')
    base_url = getattr(settings, 'LLM_BASE_URL', 'https://models.github.ai/inference').rstrip('/')

    if not api_key:
        logger.warning("LLM_API_KEY is not set. Using fallback campaign parameters.")
        return {
            "niche": "General",
            "audience": "General Audience",
            "budget": 1000.0,
            "target_reach": 10000
        }

    url = f"{base_url}/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    system_prompt = (
        "You are an expert campaign configuration assistant. "
        "Extract the following parameters from the user's input: "
        "niche (string), audience (string), budget (number), target_reach (integer). "
        "Return ONLY a JSON object with these 4 keys. "
        "If budget is not mentioned, use 1000.0. "
        "If target_reach is not mentioned, use 10000. "
        "If niche or audience are not clear, deduce a reasonable default based on the text."
    )

    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "response_format": {"type": "json_object"}
    }

    timeout = httpx.Timeout(15.0, connect=5.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"].strip()
                extracted_data = json.loads(content)
                
                # Ensure types and defaults
                return {
                    "niche": str(extracted_data.get("niche", "General")),
                    "audience": str(extracted_data.get("audience", "General Audience")),
                    "budget": float(extracted_data.get("budget", 1000.0)),
                    "target_reach": int(extracted_data.get("target_reach", 10000))
                }
            else:
                logger.error(f"Unexpected API response format: {result}")
    except Exception as e:
        logger.error(f"LLM API error during parameter extraction: {e}")
        
    return {
        "niche": "General",
        "audience": "General Audience",
        "budget": 1000.0,
        "target_reach": 10000
    }

async def generate_explanation(campaign_context: str, influencer_data: dict, fit_score: float) -> str:
    """
    Generates a natural language explanation for an influencer match using an LLM API.
    """
    api_key = getattr(settings, 'LLM_API_KEY', None)
    model_name = getattr(settings, 'LLM_MODEL_NAME', 'gpt-4o-mini')
    base_url = getattr(settings, 'LLM_BASE_URL', 'https://models.github.ai/inference').rstrip('/')

    if not api_key:
        logger.warning("LLM_API_KEY is not set. Skipping LLM explanation.")
        return "AI explanation unavailable: LLM_API_KEY is missing from environment."

    url = f"{base_url}/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
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
    base_backoff = 2

    import asyncio

    for attempt in range(max_retries):
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
                    
                    # 🚀 THE FIX: The Circuit Breaker 
                    # If the API demands we wait longer than 15 seconds, abandon the explanation.
                    if delay > 15:
                        logger.warning(f"Rate limit timeout too long ({delay}s). Skipping AI explanation.")
                        return "AI explanation skipped: API rate limit exceeded."
                else:
                    # Exponential backoff: 2s, 4s, 8s
                    delay = base_backoff * (2 ** attempt)
                
                logger.warning(f"LLM Provider rate limit hit (429). Retrying in {delay}s (Attempt {attempt + 1}/{max_retries})...")
                await asyncio.sleep(delay)
                continue
                
            logger.error(f"LLM Provider returned status {e.response.status_code}: {e.response.text}")
            return f"AI explanation failed (HTTP {e.response.status_code}): {e.response.text}"
        except Exception as e:
            logger.error(f"LLM API error during explanation generation: {e}")
            return f"AI explanation failed. Error: {str(e)}"
    
    return "AI explanation unavailable: Max retries exceeded."
