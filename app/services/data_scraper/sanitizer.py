import httpx
import logging
import asyncio
from typing import Dict, Any, List
from app.config import settings

logger = logging.getLogger(__name__)

# 1. THE SEMAPHORE: Only allow 3 concurrent LLM calls maximum across the whole app.
# Any additional requests will safely pause and wait in an async queue.
LLM_CONCURRENCY_LIMIT = asyncio.Semaphore(3)

async def sanitize_profile_data(raw_bio: str, raw_tags: List[str]) -> Dict[str, Any]:
    """
    Cleans raw social media bios and extracts strict tags using the LLM.
    Protected by concurrency limits and retry logic.
    """
    api_key = getattr(settings, 'LLM_API_KEY', None)
    base_url = getattr(settings, 'LLM_BASE_URL', 'https://models.inference.ai.azure.com')
    model_name = getattr(settings, 'LLM_MODEL_NAME', 'gpt-4o-mini')

    if not api_key:
        return {"clean_bio": raw_bio, "extracted_niche_tags": raw_tags[:5]}

    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # Strict JSON enforcement prompt
    payload = {
        "model": model_name,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system", 
                "content": "You are a data cleaner. Return a JSON object with two keys: 'clean_bio' (a 2-sentence professional summary stripping emojis/spam) and 'extracted_niche_tags' (a list of up to 5 professional tags)."
            },
            {
                "role": "user", 
                "content": f"Raw Bio: {raw_bio}\nRaw Tags: {raw_tags}"
            }
        ]
    }

    # 2. THE QUEUE: Acquire the semaphore before firing the request
    async with LLM_CONCURRENCY_LIMIT:
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.post(url, headers=headers, json=payload)
                    
                    # 3. THE BACKOFF: If we hit a rate limit, wait and retry
                    if response.status_code == 429:
                        wait_time = 2 ** attempt  # Waits 1s, then 2s, then 4s
                        logger.warning(f"LLM Rate Limited. Retrying in {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                        
                    response.raise_for_status()
                    
                    import json
                    result_data = json.loads(response.json()["choices"][0]["message"]["content"])
                    return {
                        "clean_bio": result_data.get("clean_bio", raw_bio),
                        "extracted_niche_tags": result_data.get("extracted_niche_tags", raw_tags[:5])
                    }
                    
            except Exception as e:
                logger.error(f"LLM Sanitizer error on attempt {attempt + 1}: {str(e)}")
                if attempt == max_retries - 1:
                    # Fallback to returning the raw data so the database ingestion doesn't crash
                    return {"clean_bio": raw_bio, "extracted_niche_tags": raw_tags[:5]}
                await asyncio.sleep(1) # Brief pause before next retry on general network errors
