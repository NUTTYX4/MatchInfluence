import httpx
import asyncio
import logging
import random
import sys

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Live backend endpoint mapped dynamically
BACKEND_URL = "http://127.0.0.1:8000/api/v1/influencers/ingest"

def fetch_next_handles_from_suggestions():
    """
    Simulates checking an API or suggestion endpoint to get fresh handles.
    In a real scenario, this might query an AI generator or an external trend API.
    """
    # A simulated large pool of handles spanning various niches
    ig_pool = [
        "pewdiepie", "mrbeast", "dudeperfect", "loganpaul", "jakepaul",
        "ksi", "willsmith", "kevinhart4real", "selenagomez", "taylorswift",
        "cristiano", "leomessi", "neymarjr", "virat.kohli", "lebronjames"
    ]
    
    yt_pool = [
        "UCBJycsmduvYEL83R_U4JriQ", "UCXGgrKt94gR6lmN4aN3mYTg", "UCey_c7U86mJGz1VJWH5CYPA",
        "UCsTcErHg8oDvUnTzoqsYeNw", "UCXuqSBlHAE6Xw-yeJA0Tunw", "UCVYamHliCI9rw1tHR1xbkfw",
        "UC2D2CMWXMOVWx7giW1n3LIg", "UCwZ6B-3T_E7z7x_o1e4sLKg", "UCZ93Z4-Bq0o2_7vG3K6rGZQ",
        "UCiP6wD_tYlYLYh3agzbByWQ", "UCX6OQ3DkcsbYNE6H8uQQuVA", "UCRijo3ddMTht_IHyWHNXsTg",
        "UCpSPSCBQsHCEs3j_kP4wBgw", "UC7F0K-h_D9k20_E-c36G1rA", "UCsnG01B3Jro-cQ_b7C_6X9A"
    ]
    
    # Return a batch of 5 to 10 random items to process in this cycle
    count = random.randint(5, 10)
    
    results = []
    for _ in range(count):
        if random.choice([True, False]):
            results.append({"platform": "instagram", "target_id": random.choice(ig_pool)})
        else:
            results.append({"platform": "youtube", "target_id": random.choice(yt_pool)})
            
    return results

async def crawl():
    logger.info("Initiating overnight scraper crawler...")
    logger.info("Press Ctrl+C at any time to safely shutdown.")
    
    # We use a longer timeout as Apify needs time to run
    async with httpx.AsyncClient(timeout=100.0) as client:
        while True:
            try:
                tasks = fetch_next_handles_from_suggestions()
                logger.info(f"Fetched {len(tasks)} new items for ingestion cycle.")
                
                for task in tasks:
                    platform = task["platform"]
                    target_id = task["target_id"]
                    logger.info(f"🔍 Scraping {platform} @{target_id}...")
                    
                    payload = {
                        "platform": platform,
                        "target_id": target_id
                    }
                    
                    # Global try-except layer for fault tolerance
                    try:
                        response = await client.post(BACKEND_URL, json=payload)
                        if response.status_code == 200:
                            data = response.json()
                            logger.info(f"✅ Success: {platform} @{target_id} saved! (UUID: {data.get('influencer_id', 'N/A')})")
                        else:
                            logger.error(f"❌ Failed to scrape {platform} @{target_id}: {response.status_code} - {response.text}")
                    except Exception as e:
                        logger.error(f"💥 Network/Unexpected error on {platform} @{target_id}: {e}")
                    
                    # Mandatory randomized cooling delay to prevent Apify blocking/exhaustion
                    delay = random.uniform(20.0, 45.0)
                    logger.info(f"⏳ Cooling down for {delay:.2f} seconds to respect rate limits...\n")
                    await asyncio.sleep(delay)
                    
            except Exception as e:
                logger.error(f"💥 Unexpected error in ingestion cycle: {e}")
                logger.info("⏳ Retrying in 60 seconds...")
                await asyncio.sleep(60)

if __name__ == "__main__":
    try:
        asyncio.run(crawl())
    except KeyboardInterrupt:
        logger.info("\n🛑 Shutdown signal received. Safely stopping ingestion...")
        sys.exit(0)
