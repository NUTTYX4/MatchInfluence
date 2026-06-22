import math

class ScoringEngine:
    
    @staticmethod
    def calculate_metrics(followers: int, following: int, likes: int, comments: int) -> dict:
        """Calculates raw ER, CLR, and FFR metrics safely handling zero-division."""
        followers = max(followers, 1) # Prevent DivisionByZero
        likes = max(likes, 0)
        comments = max(comments, 0)
        following = max(following, 1)

        er = ((likes + comments) / followers) * 100
        clr = (comments / likes) if likes > 0 else 0.0
        ffr = followers / following

        return {
            "er": round(er, 2),
            "clr": round(clr, 4),
            "ffr": round(ffr, 2)
        }

    @staticmethod
    def calculate_authenticity(er: float, clr: float, ffr: float, platform: str) -> float:
        """
        Calculates the Authenticity Score using sigmoid normalization.
        Weights: ER (50%), CLR (30%), FFR (20%)
        """
        # 1. Normalize ER based on platform benchmarks (Instagram ~3%, YouTube ~4%)
        er_benchmark = 3.5 if platform == "youtube" else 3.0
        norm_er = 1 / (1 + math.exp(-1.5 * (er - er_benchmark)))

        # 2. Normalize CLR (Healthy organic CLR is usually between 0.02 and 0.08)
        # We heavily penalize CLR < 0.01 (bot territory)
        if clr < 0.01:
            norm_clr = 0.1  # Severe penalty
        elif clr > 0.15:
            norm_clr = 0.8  # Good, but diminishing returns for extreme outlier comments
        else:
            # Scale linearly between 0.01 and 0.15
            norm_clr = (clr - 0.01) / 0.14 

        # 3. Normalize FFR (Authority metric)
        # FFR < 1 means they follow more people than follow them (Spam behavior)
        if ffr < 1.0:
            norm_ffr = 0.0
        elif ffr > 50.0:
            norm_ffr = 1.0 # Max authority
        else:
            norm_ffr = math.log10(ffr) / math.log10(50.0)

        # 4. Apply Weights
        w_er, w_clr, w_ffr = 0.50, 0.30, 0.20
        authenticity_score = (w_er * norm_er) + (w_clr * norm_clr) + (w_ffr * norm_ffr)

        return round(authenticity_score, 3)

    @staticmethod
    def calculate_composite_fit(semantic_score: float, authenticity_score: float) -> float:
        """
        Combines vector semantic similarity with the mathematical authenticity score.
        Fit = (0.6 * Semantic) + (0.4 * Authenticity)
        """
        alpha, beta = 0.6, 0.4
        fit_score = (alpha * semantic_score) + (beta * authenticity_score)
        return round(fit_score, 3)