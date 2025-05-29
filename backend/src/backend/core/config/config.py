"""Configuration settings for the backend application."""
import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Configuration
    api_title: str = Field(default="GYST Document Analysis API", description="API title")
    api_description: str = Field(
        default="AI-powered document analysis and tagging service using CrewAI and Google Gemini",
        description="API description"
    )
    api_version: str = Field(default="0.1.0", description="API version")
    
    # Server Configuration
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    debug: bool = Field(default=False, description="Debug mode")
    
    # AI Service Configuration
    gemini_api_key: Optional[str] = Field(default=None, env="GEMINI_API_KEY", description="Google Gemini API key")
    gemini_model: str = Field(default="gemini-2.0-flash-exp", description="Gemini model to use")
    
    # File Storage Configuration
    upload_base_dir: str = Field(default="./uploads", description="Base directory for uploaded files")
    max_file_size_mb: int = Field(default=10, description="Maximum file size in MB")
    supported_file_extensions: list = Field(
        default=[".txt", ".md", ".pdf", ".docx"],
        description="Supported file extensions"
    )
    
    # Analysis Configuration
    default_max_tags: int = Field(default=10, description="Default maximum number of tags to generate")
    max_analysis_time_seconds: int = Field(default=120, description="Maximum time for analysis in seconds")
    
    # Logging Configuration
    log_level: str = Field(default="INFO", description="Logging level")
    log_format: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        description="Log message format"
    )
    
    class Config:
        """Pydantic configuration."""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
    
    def get_upload_path(self, relative_path: str) -> Path:
        """Get the full path for an uploaded file."""
        return Path(self.upload_base_dir) / relative_path
    
    def validate_file_extension(self, file_path: str) -> bool:
        """Check if file extension is supported."""
        ext = Path(file_path).suffix.lower()
        return ext in self.supported_file_extensions
    
    def validate_gemini_config(self) -> bool:
        """Check if Gemini API configuration is valid."""
        return bool(self.gemini_api_key)


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get the global settings instance."""
    return settings
