import uuid
import logging
from app.services.llm import generate_explanation
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.influencer import Influencer
from app.models.campaign import Campaign, MatchResult
from app.database import chroma_collection
from app.services.scoring import ScoringEngine
from app.services.ai import AIEngine  # <--- NEW AI IMPORT

logger = logging.getLogger(__name__)

class MatchingOrchestrator:
    
    @staticmethod
    async def find_best_matches(db: AsyncSession, campaign_req):
        try:
            # 1. Compile the semantic text
            brief_text = f"Niche: {campaign_req.niche}. Audience: {campaign_req.audience}."

            # 2. PERSIST: Save the initial Campaign Request
            db_campaign = Campaign(
                niche=campaign_req.niche,
                audience=campaign_req.audience,
                budget=campaign_req.budget,
                target_reach=campaign_req.target_reach,
                brief_text=brief_text  # Saving the exact text the AI reads
            )
            db.add(db_campaign)
            await db.flush() 
            
            # 3. AI VECTOR EMBEDDING (Now properly awaited and offloaded to a thread)
            query_vector = await AIEngine.get_embedding(brief_text)
            
            # 4. Vector Search via ChromaDB
            chroma_results = chroma_collection.query(
                query_embeddings=[query_vector],
                n_results=campaign_req.num_results
            )
            
            if not chroma_results['ids'] or not chroma_results['ids'][0]:
                await db.commit() 
                return []

            matched_uuids = chroma_results['ids'][0]
            semantic_distances = chroma_results['distances'][0]
            
            # 5. HYDRATE: Fetch exact rows from PostgreSQL
            query = select(Influencer).where(Influencer.id.in_(matched_uuids))
            db_results = await db.execute(query)
            influencers_dict = {str(inf.id): inf for inf in db_results.scalars().all()}
            
            final_candidates = []
            
            # 6. SCORE: Run math pipeline
            for i, inf_id in enumerate(matched_uuids):
                inf = influencers_dict.get(inf_id)
                if not inf:
                    continue
                    
                distance = semantic_distances[i]
                semantic_score = max(0.0, 1.0 - (distance / 2.0))
                
                metrics = ScoringEngine.calculate_metrics(
                    inf.follower_count, inf.following_count, inf.total_likes, inf.total_comments
                )
                
                auth_score = ScoringEngine.calculate_authenticity(
                    metrics['er'], metrics['clr'], metrics['ffr'], inf.platform
                )
                fit_score = ScoringEngine.calculate_composite_fit(semantic_score, auth_score)
                
                expected_engagements = max(inf.follower_count * (metrics['er'] / 100), 1)
                cpe = (inf.price_per_post / expected_engagements) if inf.price_per_post else 0.0
                
                # Temporary AI Explanation string (Will be powered by LLM in Phase 3)
                temp_explanation = f"Matches campaign with a {round(semantic_score * 100)}% semantic confidence."

                final_candidates.append({
                    "influencer_id": inf_id,  
                    "influencer": {
                        "username": inf.username,
                        "platform": inf.platform,
                        "followers": inf.follower_count,
                        "price": inf.price_per_post
                    },
                    "metrics": metrics,
                    "scores": {
                        "semantic_match": round(semantic_score, 3),
                        "authenticity": auth_score,
                        "composite_fit": fit_score
                    },
                    "financials": {
                        "cpe": round(cpe, 4)
                    },
                    "explanation": temp_explanation
                })
                
            # 7. RANK: Sort by highest Composite Fit Score
            final_candidates.sort(key=lambda x: x["scores"]["composite_fit"], reverse=True)
            
            # 8. PERSIST: Save the MatchResult records to PostgreSQL
            for rank_index, candidate in enumerate(final_candidates):
                db_match = MatchResult(
                    campaign_id=db_campaign.id,
                    influencer_id=candidate["influencer_id"],
                    semantic_score=candidate["scores"]["semantic_match"],
                    authenticity_score=candidate["scores"]["authenticity"],
                    composite_score=candidate["scores"]["composite_fit"],
                    cpe=candidate["financials"]["cpe"],
                    explanation=candidate["explanation"],
                    rank=rank_index + 1
                )
                db.add(db_match)
                
                del candidate["influencer_id"]

            # 9. COMMIT: Execute all database writes atomically
            await db.commit()
            
            return final_candidates
            
        except Exception as e:
            # 10. ROLLBACK: Catch any DB or math failures to prevent desynchronization
            logger.error(f"Matching pipeline encountered an error: {str(e)}. Rolling back transaction.")
            await db.rollback()
            raise e