"""API package for backend."""

from fastapi import FastAPI
from backend.api.routes import documents, chat, correlations

def setup_routes(app: FastAPI):
    """Register all API routes with the FastAPI application."""
    app.include_router(documents.router, tags=["Documents"])
    app.include_router(chat.router, tags=["Chat"])
    app.include_router(correlations.router, tags=["Correlations"])
