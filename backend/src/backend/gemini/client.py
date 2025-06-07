import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Gemini client
def init_gemini_client():
    """Initialize and configure the Gemini AI client."""
    api_key = os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set")
    
    # Configure the API key
    genai.configure(api_key=api_key)
    return genai

# Create a singleton client instance
client = init_gemini_client()

# Model IDs
GEMINI_MODEL = "gemini-2.0-flash-exp"

# Export the client for use in other modules
__all__ = ["client", "GEMINI_MODEL"]
