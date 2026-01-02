"""
Deepgram Speech-to-Text integration for real-time transcription.
"""

import asyncio
import logging
from typing import Callable, Optional
import httpx

from deepgram import DeepgramClient

logger = logging.getLogger(__name__)


async def transcribe_audio(api_key: str, audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
    """Transcribe audio bytes directly using Deepgram REST API.
    
    Args:
        api_key: Deepgram API key
        audio_bytes: Raw audio data
        mime_type: Audio MIME type (e.g., 'audio/webm', 'audio/wav')
        
    Returns:
        Transcribed text
    """
    # Use httpx directly for more control over the request
    url = "https://api.deepgram.com/v1/listen"
    
    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": mime_type,
    }
    
    params = {
        "model": "nova-2",
        "smart_format": "true",
        "language": "en",
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                headers=headers,
                params=params,
                content=audio_bytes,
            )
            
            if response.status_code != 200:
                logger.error(f"Deepgram API error: {response.status_code} - {response.text}")
                raise Exception(f"Deepgram API error: {response.status_code}")
            
            result = response.json()
            
            # Extract transcript
            channels = result.get("results", {}).get("channels", [])
            if channels:
                alternatives = channels[0].get("alternatives", [])
                if alternatives:
                    transcript = alternatives[0].get("transcript", "")
                    return transcript.strip()
            
            return ""
            
    except httpx.TimeoutException:
        logger.error("Deepgram request timed out")
        raise Exception("Transcription timed out")
    except Exception as e:
        logger.error(f"Deepgram transcription error: {e}")
        raise


class DeepgramSTT:
    """Real-time speech-to-text using Deepgram."""
    
    def __init__(self, api_key: str, sample_rate: int = 16000):
        """Initialize Deepgram client.
        
        Args:
            api_key: Deepgram API key
            sample_rate: Audio sample rate in Hz
        """
        self.api_key = api_key
        self.sample_rate = sample_rate
        self._final_transcript = ""
    
    async def transcribe(self, audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
        """Transcribe audio bytes.
        
        Args:
            audio_bytes: Raw audio data
            mime_type: Audio MIME type
            
        Returns:
            Transcribed text
        """
        return await transcribe_audio(self.api_key, audio_bytes, mime_type)


async def transcribe_file(api_key: str, audio_path: str) -> str:
    """Transcribe an audio file (for testing).
    
    Args:
        api_key: Deepgram API key
        audio_path: Path to audio file
        
    Returns:
        Transcribed text
    """
    with open(audio_path, "rb") as f:
        audio_data = f.read()
    
    # Determine mime type from extension
    if audio_path.endswith(".wav"):
        mime_type = "audio/wav"
    elif audio_path.endswith(".mp3"):
        mime_type = "audio/mp3"
    elif audio_path.endswith(".webm"):
        mime_type = "audio/webm"
    else:
        mime_type = "audio/wav"
    
    return await transcribe_audio(api_key, audio_data, mime_type)
