"""
Edge TTS integration.

Uses edge-tts (Microsoft Edge's online TTS service) as a lightweight, high-quality alternative to local models.
"""

import asyncio
import logging
import io
import edge_tts

logger = logging.getLogger(__name__)

class EdgeTTS:
    """Text-to-speech using Microsoft Edge TTS."""
    
    def __init__(self, voice: str = "en-US-ChristopherNeural"):
        """Initialize TTS engine.
        
        Args:
            voice: The Edge TTS voice to use.
        """
        self.default_voice = voice
        logger.info(f"Initialized EdgeTTS with voice: {self.default_voice}")
    
    async def synthesize(self, text: str, voice: str = None) -> bytes:
        """Synthesize speech from text using Edge TTS.
        
        Args:
            text: Text to synthesize
            voice: Optional override for the voice
            
        Returns:
            Audio bytes (MP3 format)
        """
        target_voice = voice or self.default_voice
        communicate = edge_tts.Communicate(text, target_voice)
        
        # Capture audio to memory
        audio_stream = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_stream.write(chunk["data"])
        
        return audio_stream.getvalue()

# Quick test
async def test_tts():
    """Test TTS synthesis."""
    try:
        tts = EdgeTTS()
        logger.info("Synthesizing test audio...")
        audio = await tts.synthesize("Hello! I am now using Edge TTS.")
        print(f"Generated {len(audio)} bytes of audio")
    except Exception as e:
        logger.error(f"Test failed: {e}")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(test_tts())
