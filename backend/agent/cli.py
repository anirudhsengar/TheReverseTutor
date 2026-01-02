"""
CLI interface for testing the Socratic Tutor without audio.
"""

import asyncio
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import get_settings
from agent.graph import create_tutor_graph


WELCOME_MESSAGE = """
╔══════════════════════════════════════════════════════════════╗
║              THE REVERSE TUTOR - CLI Mode                   ║
║                                                             ║
║  Explain any concept. I'll challenge your understanding.    ║
║  Type 'quit' to exit.                                       ║
╚══════════════════════════════════════════════════════════════╝
"""


async def main():
    """Run the CLI interface."""
    print(WELCOME_MESSAGE)
    
    settings = get_settings()
    graph = create_tutor_graph(settings)
    
    # Session state
    messages = []
    turn = 0
    
    print("🎓 Tutor: What concept would you like to explain to me today?\n")
    
    while True:
        try:
            user_input = input("📝 You: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n\n👋 Session ended. Keep learning!")
            break
        
        if not user_input:
            continue
        
        if user_input.lower() in ("quit", "exit", "q"):
            print("\n👋 Session ended. Keep learning!")
            break
        
        print("\n🤔 Thinking...\n")
        
        try:
            result = await graph.ainvoke({
                "messages": messages,
                "user_input": user_input,
                "current_topic": None,
                "explanation_quality": None,
                "turn_count": turn,
            })
            
            response = result.get("response_text", "I need you to try explaining that again.")
            quality = result.get("explanation_quality", "unknown")
            messages = result.get("messages", messages)
            turn += 1
            
            # Quality indicator
            quality_icons = {
                "correct": "✅",
                "incorrect": "❌",
                "shallow": "🔍",
                "vague": "❓",
            }
            quality_icon = quality_icons.get(quality, "💭")
            
            print(f"🎓 Tutor [{quality_icon}]: {response}\n")
            
        except Exception as e:
            print(f"⚠️ Error: {e}\n")
            continue


if __name__ == "__main__":
    asyncio.run(main())
