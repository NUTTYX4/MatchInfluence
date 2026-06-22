from sentence_transformers import SentenceTransformer

# Load the model into memory. 
# 'all-MiniLM-L6-v2' is fast, free, and produces 384-dimensional vectors 
# which perfectly matches ChromaDB's default space.
print("Loading HuggingFace AI Model... (This may take a few seconds on the first run)")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("AI Model Loaded Successfully!")

class AIEngine:
    @staticmethod
    def get_embedding(text: str) -> list[float]:
        """
        Reads English text and converts its semantic meaning 
        into a 384-dimensional mathematical coordinate.
        """
        # Encode the text and convert the numpy array to a standard Python list
        vector = model.encode(text).tolist()
        return vector