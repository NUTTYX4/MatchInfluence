import asyncio
import json
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models.influencer import Influencer
from app.models.campaign import Campaign

async def seed_database():
    print("Loading data.json...")
    try:
        with open("data/data.json", "r") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error loading data.json: {e}")
        return

    influencers_data = data.get("influencers", [])
    campaigns_data = data.get("campaigns", [])

    print(f"Found {len(influencers_data)} influencers and {len(campaigns_data)} campaigns.")

    async with AsyncSessionLocal() as db:
        try:
            print("Fetching existing data to prevent duplicates...")
            from sqlalchemy import select
            
            existing_inf_result = await db.execute(select(Influencer.username))
            existing_usernames = {row[0] for row in existing_inf_result.all()}
            
            print("Inserting influencers...")
            for inf in influencers_data:
                username = inf.get("username")
                if username in existing_usernames:
                    continue

                # Data cleaning
                price = inf.get("price_per_post")
                if price is None:
                    price = 0.0
                
                db_influencer = Influencer(
                    username=username,
                    full_name=inf.get("full_name"),
                    platform=inf.get("platform"),
                    profile_url=inf.get("profile_url"),
                    follower_count=inf.get("follower_count", 0),
                    following_count=inf.get("following_count", 0),
                    total_likes=inf.get("total_likes", 0),
                    total_comments=inf.get("total_comments", 0),
                    post_count=inf.get("post_count", 0),
                    price_per_post=price,
                    bio=inf.get("bio"),
                    niche_tags=inf.get("niche_tags", []),
                    source=inf.get("source")
                )
                
                # Optional: Calculate initial baseline engagement rate
                if db_influencer.follower_count > 0:
                    total_engagements = db_influencer.total_likes + db_influencer.total_comments
                    db_influencer.engagement_rate = float(total_engagements / db_influencer.follower_count)

                db.add(db_influencer)

            print("Inserting campaigns...")
            for camp in campaigns_data:
                db_campaign = Campaign(
                    niche=camp.get("niche", ""),
                    audience=camp.get("audience", ""),
                    budget=camp.get("budget", 0.0),
                    target_reach=camp.get("target_reach", 0),
                    brief_text=f"Niche: {camp.get('niche', '')}. Audience: {camp.get('audience', '')}."
                )
                db.add(db_campaign)

            await db.commit()
            print("[SUCCESS] Database seeding complete! Successfully inserted influencers and campaigns.")
        except Exception as e:
            print(f"[ERROR] Error during database insertion: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(seed_database())