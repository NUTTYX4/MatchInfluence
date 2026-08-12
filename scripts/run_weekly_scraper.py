import asyncio
import logging
import os
import sys

# Add root directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Fix Windows asyncio policy before any imports that use asyncio
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from scripts.scraper_circuit_breaker import crawl

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [%(levelname)s] - %(message)s")
logger = logging.getLogger(__name__)

async def run_weekly_job():
    """
    Automated job designed to run every 7 days post-deployment.
    It executes the AI creator discovery and data enrichment scraper to ensure:
    1. Existing influencer metrics (followers, engagement rate, CPE) are up-to-date.
    2. New candidate creators matching active user briefs are discovered and ingested into PostgreSQL/ChromaDB.
    3. Prediction engines have fresh, highly accurate organic data for matching routines.
    """
    logger.info("==================================================================")
    logger.info("Starting MatchInfluence Weekly Creator Discovery & Refresh Job")
    logger.info("==================================================================")

    try:
        await crawl()
        logger.info("Weekly Creator Data Refresh completed successfully.")
    except KeyboardInterrupt:
        logger.info("Shutdown signal received. Stopping scraper gracefully.")
    except Exception as e:
        logger.error(f"Error during weekly scraper execution: {e}", exc_info=True)

if __name__ == "__main__":
    logger.info("Initializing 7-Day automated data synchronization...")
    try:
        asyncio.run(run_weekly_job())
    except KeyboardInterrupt:
        print("\nStopped by user.")
        sys.exit(0)
