"""Main module for the FastAPI application."""
import uvicorn
import sys
from pathlib import Path

# Add src directory to the path so we can import our modules
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from src.backend.api.routes import documents, chat, correlations

# Create the FastAPI application
app = FastAPI(
    title="GYST API",
    description="API for document analysis, chat, correlation, and AI capabilities",
    version="0.1.0"
)

# Include routers
app.include_router(documents.router, prefix="/api", tags=["Documents"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(correlations.router, prefix="/api", tags=["Correlations"])

@app.get("/", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "message": "API is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
