import httpx
import logging
import json
import re
import asyncio
from app.config import settings

logger = logging.getLogger(__name__)

def _extract_json_from_text(text: str) -> dict:
    """
    Robustly extracts a JSON object from text, even if wrapped in markdown blocks
    like ```json ... ``` or if there is conversational preamble.
    """
    # 1. Strip whitespace
    text = text.strip()
    
    # 2. Try to find json code block
    match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if match:
        text = match.group(1).strip()
    else:
        # Fallback: just try to find the first { and last }
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1 and end >= start:
            text = text[start:end+1]
            
    # 3. Parse and return
    try:
        return json.loads(text)
    except Exception as e:
        logger.error(f"Failed to parse JSON from LLM output. Raw: {text}. Error: {e}")
        raise ValueError(f"Invalid JSON: {e}")

async def analyze_brief_intent(user_prompt: str) -> dict:
    """
    Analyzes a brief prompt and attempts to extract campaign parameters,
    determines missing fields, and provides smart suggestions.
    """
    api_key = getattr(settings, 'LLM_API_KEY', None)
    model_name = getattr(settings, 'LLM_MODEL_NAME', 'gpt-4o-mini')
    base_url = getattr(settings, 'LLM_BASE_URL', 'https://models.github.ai/inference').rstrip('/')

    fallback_response = {
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
        "is_complete": False,
        "co_pilot_message": "I'm having trouble analyzing your brief right now, but please fill out the manual fields to proceed."
    }

    if not api_key:
        logger.warning("LLM_API_KEY is not set. Using fallback analysis.")
        return fallback_response

    url = f"{base_url}/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    system_prompt = (
        "You are an expert marketing co-pilot assistant. "
        "Your goal is to parse the user's campaign brief and extract: "
        "niche (string), audience (string), budget (numeric float), and target_reach (numeric integer). "
        "If budget or target_reach are text (e.g., 'ten grand'), convert to numbers (e.g., 10000). "
        "If any of these 4 fields are missing, add their names to 'missing_fields' and set their values to null. "
        "For each missing field, provide 2-3 highly relevant suggestions in 'suggestions'. "
        "Set 'is_complete' to true ONLY if all 4 fields are extracted. "
        "Critically: Generate a 'co_pilot_message' string dynamically. If fields are missing, act like a friendly chatbot asking for them (e.g., 'I see you want to target gamers. What is your budget?'). If complete, say something like 'Great! I have all the details. Let's find your influencers!'. "
        "Return ONLY a raw JSON object (do NOT wrap it in markdown block quotes). It MUST match this structure: {\"niche\": \"...\", \"audience\": \"...\", \"budget\": 1000.0, \"target_reach\": 5000, \"missing_fields\": [], \"suggestions\": {}, \"is_complete\": true/false, \"co_pilot_message\": \"...\"}."
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
                content = result["choices"][0]["message"]["content"]
                
                extracted_data = _extract_json_from_text(content)
                
                # Strict type coercion
                niche = str(extracted_data["niche"]) if extracted_data.get("niche") is not None else None
                audience = str(extracted_data["audience"]) if extracted_data.get("audience") is not None else None
                
                budget = None
                if extracted_data.get("budget") is not None:
                    try:
                        budget = float(extracted_data["budget"])
                    except (ValueError, TypeError):
                        pass

                target_reach = None
                if extracted_data.get("target_reach") is not None:
                    try:
                        target_reach = int(float(extracted_data["target_reach"]))
                    except (ValueError, TypeError):
                        pass
                
                return {
                    "niche": niche,
                    "audience": audience,
                    "budget": budget,
                    "target_reach": target_reach,
                    "missing_fields": list(extracted_data.get("missing_fields", [])),
                    "suggestions": dict(extracted_data.get("suggestions", {})),
                    "is_complete": bool(extracted_data.get("is_complete", False)),
                    "co_pilot_message": str(extracted_data.get("co_pilot_message", "I've processed your brief!"))
                }
            else:
                logger.error(f"Unexpected API response format: {result}")
    except Exception as e:
        logger.error(f"LLM API error during brief analysis: {e}")
        
    return fallback_response

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
        "Return ONLY a raw JSON object with these 4 keys. "
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
                content = result["choices"][0]["message"]["content"]
                extracted_data = _extract_json_from_text(content)
                
                # Ensure types and defaults
                try:
                    budget = float(extracted_data.get("budget", 1000.0))
                except (ValueError, TypeError):
                    budget = 1000.0
                    
                try:
                    target_reach = int(float(extracted_data.get("target_reach", 10000)))
                except (ValueError, TypeError):
                    target_reach = 10000
                    
                return {
                    "niche": str(extracted_data.get("niche", "General")),
                    "audience": str(extracted_data.get("audience", "General Audience")),
                    "budget": budget,
                    "target_reach": target_reach
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
                    
                    if delay > 15:
                        logger.warning(f"Rate limit timeout too long ({delay}s). Skipping AI explanation.")
                        return "AI explanation skipped: API rate limit exceeded."
                else:
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
