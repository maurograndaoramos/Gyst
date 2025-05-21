"""
Utility functions for working with Gemini AI.
"""
from typing import Optional

from .client import client, GEMINI_MODEL

async def generate_text(
    prompt: str, 
    model_id: str = GEMINI_MODEL, 
    temperature: float = 0.7,
    max_output_tokens: int = 800,
    system_instruction: Optional[str] = None
) -> str:
    """
    Generate text using Gemini AI.
    
    Args:
        prompt: The text prompt to send to Gemini
        model_id: The model ID to use (defaults to gemini-1.5-pro)
        temperature: Controls randomness (0.0-1.0)
        max_output_tokens: Maximum output length
        system_instruction: Optional system instruction to guide the model
        
    Returns:
        Generated text response
    """
    config = {
        "temperature": temperature,
        "max_output_tokens": max_output_tokens,
    }
    
    if system_instruction:
        config["system_instruction"] = system_instruction
    
    response = await client.models.generate_content_async(
        model=model_id,
        contents=[{"role": "user", "parts": [prompt]}],
        generation_config=config
    )
    
    return response.text

async def create_chat_session(
    model_id: str = GEMINI_MODEL, 
    system_instruction: Optional[str] = None,
    temperature: float = 0.7,
):
    """
    Create a new chat session with Gemini AI.
    
    Args:
        model_id: The model ID to use
        system_instruction: Optional system instruction
        temperature: Controls randomness (0.0-1.0)
        
    Returns:
        A chat session object
    """
    config = {
        "temperature": temperature,
    }
    
    if system_instruction:
        config["system_instruction"] = system_instruction
    
    chat = await client.chats.create_async(
        model=model_id,
        config=config
    )
    
    return chat
