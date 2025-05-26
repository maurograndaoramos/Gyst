import os
from google import genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Gemini client
def init_gemini_client():
    """Initialize and configure the Gemini AI client."""
    api_key = os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set")
    
    return genai.Client(api_key=api_key)

# Create a singleton client instance
client = init_gemini_client()

# Model IDs
GEMINI_MODEL = "gemini-2.0-pro"

# Export the client for use in other modules
__all__ = ["client", "GEMINI_MODEL"]
