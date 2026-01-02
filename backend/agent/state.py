"""
Session State for LangGraph conversation flow.
"""

from typing import TypedDict, Optional, Literal


class SessionState(TypedDict, total=False):
    """State schema for the tutoring session graph."""
    
    # Conversation history
    messages: list[dict]
    
    # Current user input
    user_input: str
    
    # Topic being discussed
    current_topic: Optional[str]
    
    # Quality assessment of the user's explanation
    explanation_quality: Optional[Literal["correct", "incorrect", "vague", "shallow"]]
    
    # AI response text
    response_text: str
    
    # Turn counter
    turn_count: int
    
    # Audio data (for future use)
    audio_buffer: Optional[bytes]
