"""
The Reverse Tutor - FastAPI Application Entry Point
"""

import base64
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from config import get_settings
from agent.graph import create_tutor_graph
from agent.state import SessionState
from audio.stt import transcribe_audio
from audio.tts import EdgeTTS


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("🎓 The Reverse Tutor starting up...")
    yield
    logger.info("👋 The Reverse Tutor shutting down...")


app = FastAPI(
    title="The Reverse Tutor",
    description="Learn by teaching - A Feynman Technique AI assistant",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "The Reverse Tutor"}


@app.websocket("/ws/session")
async def websocket_session(websocket: WebSocket):
    """WebSocket endpoint for real-time tutoring sessions."""
    await websocket.accept()
    logger.info("New tutoring session connected")
    
    settings = get_settings()
    
    # Check for required API keys
    if settings.llm_provider == "groq" and not settings.groq_api_key:
        await websocket.send_json({
            "type": "error",
            "text": "GROQ_API_KEY is not configured. Please add it to your .env file.",
        })
        await websocket.close(code=1008, reason="Missing API key")
        return
    elif settings.llm_provider == "openai" and not settings.openai_api_key:
        await websocket.send_json({
            "type": "error",
            "text": "OPENAI_API_KEY is not configured. Please add it to your .env file.",
        })
        await websocket.close(code=1008, reason="Missing API key")
        return
    
    # Check for Deepgram API key for audio transcription
    if not settings.deepgram_api_key:
        await websocket.send_json({
            "type": "error",
            "text": "DEEPGRAM_API_KEY is not configured. Voice input requires this. Please add it to your .env file.",
        })
        await websocket.close(code=1008, reason="Missing Deepgram API key")
        return
    
    try:
        graph = create_tutor_graph(settings)
    except Exception as e:
        logger.error(f"Failed to create tutor graph: {e}")
        await websocket.send_json({
            "type": "error",
            "text": f"Failed to initialize: {str(e)}",
        })
        await websocket.close(code=1011, reason="Initialization failed")
        return
    
    # Initialize TTS engine
    tts = EdgeTTS()
    
    # Initialize session state
    state: SessionState = {
        "messages": [],
        "current_topic": None,
        "explanation_quality": None,
        "turn_count": 0,
    }
    
    try:
        while True:
            # Receive user input (text or audio)
            data = await websocket.receive_json()
            
            # Handle audio input
            if data.get("type") == "audio":
                audio_base64 = data.get("audio", "")
                if not audio_base64:
                    continue
                
                # Decode base64 audio
                try:
                    audio_bytes = base64.b64decode(audio_base64)
                except Exception as e:
                    logger.error(f"Failed to decode audio: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "text": "Failed to decode audio data",
                    })
                    continue
                
                # Transcribe with Deepgram
                try:
                    user_input = await transcribe_audio(
                        settings.deepgram_api_key,
                        audio_bytes,
                        mime_type=data.get("mimeType", "audio/webm")
                    )
                    
                    if not user_input or not user_input.strip():
                        await websocket.send_json({
                            "type": "error",
                            "text": "Could not understand audio. Please try speaking again.",
                        })
                        continue
                    
                    # Send transcript to frontend
                    await websocket.send_json({
                        "type": "transcript",
                        "text": user_input,
                    })
                    
                except Exception as e:
                    logger.error(f"Transcription failed: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "text": f"Transcription failed: {str(e)}",
                    })
                    continue
            
            # Handle text input (fallback)
            else:
                user_input = data.get("text", "")
                if not user_input:
                    continue
            
            # Run the LangGraph agent
            result = await graph.ainvoke({
                **state,
                "user_input": user_input,
            })
            
            # Update state
            state = {
                "messages": result.get("messages", state["messages"]),
                "current_topic": result.get("current_topic", state["current_topic"]),
                "explanation_quality": result.get("explanation_quality"),
                "turn_count": state["turn_count"] + 1,
            }
            
            # Send response back
            response_text = result.get("response_text", "")
            await websocket.send_json({
                "type": "response",
                "text": response_text,
                "quality": result.get("explanation_quality", "unknown"),
                "turn": state["turn_count"],
            })
            
            # Synthesize and send TTS audio
            try:
                audio_bytes = await tts.synthesize(response_text)
                audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                await websocket.send_json({
                    "type": "audio",
                    "audio": audio_base64,
                    "mimeType": "audio/mp3",
                })
            except Exception as e:
                logger.warning(f"TTS failed, continuing without audio: {e}")
            
    except WebSocketDisconnect:
        logger.info("Tutoring session disconnected")
    except Exception as e:
        logger.error(f"Session error: {e}")
        await websocket.close(code=1011, reason=str(e))


@app.post("/api/chat")
async def chat_endpoint(request: dict):
    """Simple HTTP endpoint for text-based chat (for testing)."""
    settings = get_settings()
    graph = create_tutor_graph(settings)
    
    user_input = request.get("text", "")
    messages = request.get("messages", [])
    
    result = await graph.ainvoke({
        "messages": messages,
        "user_input": user_input,
        "current_topic": None,
        "explanation_quality": None,
        "turn_count": len(messages) // 2,
    })
    
    return {
        "response": result.get("response_text", ""),
        "quality": result.get("explanation_quality", "unknown"),
        "messages": result.get("messages", []),
    }


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
