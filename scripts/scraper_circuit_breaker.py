import os
import json
import random
import asyncio
import logging
import sys
import re
import httpx
from dotenv import load_dotenv

# Configure logging with UTF-8 stream to prevent charmap errors on Windows
_handler = logging.StreamHandler(stream=open(sys.stdout.fileno(), mode='w', encoding='utf-8', closefd=False))
_handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s: %(message)s"))
logging.basicConfig(level=logging.INFO, handlers=[_handler])
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.critical("GEMINI_API_KEY is missing. Please set it in the .env file.")
    sys.exit(1)

GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={GEMINI_API_KEY}"
INGEST_URL = os.getenv("INGEST_URL", "http://127.0.0.1:8000/influencers/ingest")

NICHES = [
    "Indian tech reviewers",
    "Bengaluru fitness coaches",
    "startup founders/finance creators",
    "street food vloggers",
    "emerging AR/VR/robotics enthusiasts"
]

async def fetch_ai_suggestions(client: httpx.AsyncClient, platform: str) -> list:
    """Fetches AI suggestions for handles/IDs based on a random niche."""
    niche = random.choice(NICHES)
    logger.info(f"[AI] Asking for {platform} creators in niche: {niche}")
    
    headers = {
        "Content-Type": "application/json"
    }
    
    if platform == "instagram":
        system_prompt = (
            "You are a raw data generator. Return ONLY a valid JSON array of 5 strings representing real, "
            "active public Instagram usernames. "
            "CRITICAL: Do NOT return YouTube channel IDs (like UC...). Instagram usernames ONLY. "
            "Do NOT wrap the response in markdown, do NOT include any explanatory text, and do NOT include the '@' symbol. "
            "Example: [\"mkbhd\", \"technicalguruji\"]"
        )
        user_prompt = f"Give me 5 real Instagram creators who are {niche}."
    else:
        system_prompt = (
            "You are a raw data generator. Return ONLY a valid JSON array of 5 strings representing real, "
            "active public YouTube channel names or handles. "
            "CRITICAL: Do NOT return YouTube channel IDs (like UC...). "
            "Do NOT wrap the response in markdown, do NOT include any explanatory text. "
            "Example: [\"MrBeast\", \"mkbhd\", \"Linus Tech Tips\"]"
        )
        user_prompt = f"Give me the YouTube Channel names or handles for 5 real creators who are {niche}."
    
    payload = {
        "contents": [{
            "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]
        }],
        "generationConfig": {
            "temperature": 0.7
        }
    }
    
    try:
        response = await client.post(GEMINI_URL, headers=headers, json=payload, timeout=30.0)
        response.raise_for_status()
        
        data = response.json()
        content = data['candidates'][0]['content']['parts'][0]['text'].strip()
        
        # Robust regex extraction to grab the JSON array even if the AI gets chatty
        match = re.search(r'\[.*\]', content, re.DOTALL)
        if match:
            json_str = match.group(0)
            handles = json.loads(json_str)
            
            if isinstance(handles, list) and all(isinstance(h, str) for h in handles):
                return handles
            else:
                logger.error(f"Invalid format received from AI: {handles}")
                return []
        else:
            logger.error(f"Failed to extract JSON array from AI response: {content}")
            return []
            
    except Exception as e:
        logger.error(f"Failed to fetch AI suggestions: {str(e)}")
        return []

async def crawl():
    logger.info("Initiating overnight crawler with Circuit Breaker...")
    logger.info("Press Ctrl+C at any time to safely shutdown.")
    
    consecutive_errors = 0
    ERROR_THRESHOLD = 5
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        while True:
            try:
                platform = random.choice(["instagram", "youtube"])
                handles = await fetch_ai_suggestions(client, platform)
                
                if not handles:
                    logger.info("No handles fetched this round, waiting 10 seconds before retry...")
                    consecutive_errors += 1
                    if consecutive_errors >= ERROR_THRESHOLD:
                        logger.critical(f"Circuit Breaker Triggered: {consecutive_errors} consecutive failures fetching handles. Exiting.")
                        break
                    await asyncio.sleep(10)
                    continue
                    
                logger.info(f"Fetched {len(handles)} items: {', '.join(handles)}")
                
                for handle in handles:
                    clean_handle = handle.replace("@", "").strip()
                    logger.info(f"[>] Ingesting {platform} @{clean_handle}...")
                    
                    # Fix 422: Changed key from 'handle' to 'target_id'
                    payload = {
                        "platform": platform,
                        "target_id": clean_handle
                    }
                    
                    try:
                        response = await client.post(INGEST_URL, json=payload)
                        if response.status_code in [200, 201]:
                            logger.info(f"[OK] {platform} @{clean_handle} ingested!")
                            consecutive_errors = 0 # Reset on successful ingestion
                        else:
                            logger.error(f"[FAIL] {platform} @{clean_handle} (Status {response.status_code}): {response.text}")
                            consecutive_errors += 1
                    except httpx.RequestError as e:
                        logger.error(f"[NET ERR] {platform} @{clean_handle}: {str(e)}")
                        consecutive_errors += 1
                    except Exception as e:
                        logger.error(f"[ERR] {platform} @{clean_handle}: {str(e)}")
                        consecutive_errors += 1
                    
                    if consecutive_errors >= ERROR_THRESHOLD:
                        logger.critical(f"Circuit Breaker Triggered: {consecutive_errors} consecutive ingestion failures. Exiting.")
                        return # Exit the function
                    
                    delay = random.uniform(20.0, 40.0)
                    logger.info(f"[WAIT] Cooling down for {delay:.2f}s...")
                    await asyncio.sleep(delay)
                    
            except Exception as e:
                logger.error(f"Critical error in main crawler loop: {str(e)}")
                consecutive_errors += 1
                if consecutive_errors >= ERROR_THRESHOLD:
                    logger.critical(f"Circuit Breaker Triggered: {consecutive_errors} consecutive critical loop errors. Exiting.")
                    break
                logger.info("⏳ Retrying in 60 seconds...")
                await asyncio.sleep(60)

if __name__ == "__main__":
    # Windows asyncio policy fix (prevents EventLoop errors on Ctrl+C)
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    try:
        asyncio.run(crawl())
    except KeyboardInterrupt:
        print("\n🛑 Shutdown signal received. Safely stopping ingestion...")
        sys.exit(0)
