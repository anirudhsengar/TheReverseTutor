"""
LangGraph State Machine for the Socratic Tutor with Tavily Web Search.
"""

import json
import re
import logging
from typing import Literal, Annotated, Sequence
import operator

from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_core.tools import tool
from tavily import TavilyClient

from .state import SessionState
from .prompts import SOCRATIC_SYSTEM_PROMPT, ANALYSIS_PROMPT

logger = logging.getLogger(__name__)


def get_llm(settings):
    """Get the appropriate LLM based on settings."""
    if settings.llm_provider == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=settings.groq_model,
            api_key=settings.groq_api_key,
            temperature=0.7,
        )
    else:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            temperature=0.7,
        )


def create_tavily_tool(api_key: str):
    """Create a Tavily search tool."""
    client = TavilyClient(api_key=api_key)
    
    @tool
    def search_web(query: str) -> str:
        """Search the web for information to verify facts or find additional context.
        
        Use this tool when:
        - You need to verify a factual claim the user made
        - You want to find specific examples or data
        - The topic requires up-to-date information
        
        Args:
            query: The search query string
            
        Returns:
            Search results with relevant information
        """
        try:
            response = client.search(
                query=query,
                search_depth="basic",
                max_results=3,
            )
            
            results = []
            for result in response.get("results", []):
                results.append(f"**{result.get('title', 'No title')}**\n{result.get('content', '')}\nSource: {result.get('url', '')}")
            
            if results:
                return "\n\n---\n\n".join(results)
            else:
                return "No relevant results found."
                
        except Exception as e:
            logger.error(f"Tavily search failed: {e}")
            return f"Search failed: {str(e)}"
    
    return search_web


def create_tutor_graph(settings):
    """Create the LangGraph state machine for tutoring sessions."""
    
    llm = get_llm(settings)
    
    # Create tools
    tools = []
    if settings.tavily_api_key:
        search_tool = create_tavily_tool(settings.tavily_api_key)
        tools.append(search_tool)
        logger.info("Tavily web search enabled")
    
    # Bind tools to LLM if available
    if tools:
        llm_with_tools = llm.bind_tools(tools)
    else:
        llm_with_tools = llm
    
    # Node: Analyze the user's explanation
    async def analyze_explanation(state: SessionState) -> SessionState:
        """Analyze the quality and accuracy of the user's explanation."""
        user_input = state.get("user_input", "")
        messages = state.get("messages", [])
        
        # Build context from previous messages
        context = "\n".join([
            f"{'User' if m.get('role') == 'user' else 'Tutor'}: {m.get('content', '')}"
            for m in messages[-6:]  # Last 3 exchanges
        ])
        
        analysis_prompt = ANALYSIS_PROMPT.format(
            user_input=user_input,
            context=context if context else "No previous context",
        )
        
        try:
            response = await llm.ainvoke([
                SystemMessage(content="You are an expert at analyzing explanations for accuracy and depth. Respond only with valid JSON."),
                HumanMessage(content=analysis_prompt),
            ])
            
            # Parse JSON from response
            content = response.content
            # Try to extract JSON from the response
            json_match = re.search(r'\{[^{}]*\}', content, re.DOTALL)
            if json_match:
                analysis = json.loads(json_match.group())
                quality = analysis.get("quality", "vague")
            else:
                quality = "vague"
        except Exception as e:
            logger.warning(f"Analysis failed: {e}, defaulting to 'vague'")
            quality = "vague"
        
        return {
            **state,
            "explanation_quality": quality,
        }
    
    # Node: Generate Socratic response (with optional tool use)
    async def generate_response(state: SessionState) -> SessionState:
        """Generate the tutor's Socratic response, optionally using web search."""
        user_input = state.get("user_input", "")
        messages = state.get("messages", [])
        quality = state.get("explanation_quality", "vague")
        
        # Enhanced system prompt with tool awareness
        enhanced_system = SOCRATIC_SYSTEM_PROMPT
        if tools:
            enhanced_system += """

## Web Search Tool
You have access to a web search tool. Use it when:
- You need to verify a specific fact the user mentioned
- The topic involves recent events or data
- You want to provide a concrete example or counterexample

Do NOT use search for:
- Basic concepts you already know
- Philosophical questions
- Testing the user's understanding (your main job)"""
        
        # Build message history for LLM
        llm_messages = [SystemMessage(content=enhanced_system)]
        
        for msg in messages:
            if msg.get("role") == "user":
                llm_messages.append(HumanMessage(content=msg.get("content", "")))
            else:
                llm_messages.append(AIMessage(content=msg.get("content", "")))
        
        # Add current user input with quality hint
        quality_context = {
            "correct": "The user's explanation appears accurate. Probe for deeper understanding.",
            "incorrect": "The user's explanation contains errors. Guide them to discover the mistake.",
            "shallow": "The explanation is correct but surface-level. Push for the 'why'.",
            "vague": "The explanation is unclear. Ask for clarification and specifics.",
        }
        
        enhanced_input = f"""User's explanation: {user_input}

[Internal note: {quality_context.get(quality, quality_context['vague'])}]"""
        
        llm_messages.append(HumanMessage(content=enhanced_input))
        
        try:
            # First call - might request tool use
            response = await llm_with_tools.ainvoke(llm_messages)
            
            # Handle tool calls if present
            if hasattr(response, 'tool_calls') and response.tool_calls:
                # Execute tool calls
                tool_results = []
                for tool_call in response.tool_calls:
                    if tool_call['name'] == 'search_web' and tools:
                        search_result = tools[0].invoke(tool_call['args'])
                        tool_results.append(f"[Search results for '{tool_call['args'].get('query', '')}']:\n{search_result}")
                
                # Add tool results and get final response
                if tool_results:
                    llm_messages.append(response)
                    llm_messages.append(HumanMessage(content="\n\n".join(tool_results)))
                    response = await llm.ainvoke(llm_messages)
            
            response_text = response.content
            
            # Extract just the response part if analysis tags are present
            # Extract just the response part
            # Strategy 1: Look for explicit <response> tags
            if "<response>" in response_text:
                match = re.search(r'<response>(.*?)</response>', response_text, re.DOTALL)
                if match:
                    response_text = match.group(1).strip()
            
            # Strategy 2: If no <response> tags, look for the end of the analysis block
            elif "</analysis>" in response_text:
                parts = response_text.split("</analysis>")
                if len(parts) > 1:
                    response_text = parts[-1].strip()
            
            # Strategy 3: If no tags but "Analysis:" keyword appears at the start
            elif response_text.strip().lower().startswith("analysis:") or response_text.strip().lower().startswith("<analysis>"):
                # aggressive fallback: try to find the start of the actual response
                # assume double newline separates analysis from response
                parts = re.split(r'\n\s*\n', response_text, maxsplit=1)
                if len(parts) > 1:
                    response_text = parts[-1].strip()
                    
        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            response_text = "I'm having trouble processing that. Could you try explaining it again?"
        
        # Update message history
        new_messages = messages + [
            {"role": "user", "content": user_input},
            {"role": "assistant", "content": response_text},
        ]
        
        return {
            **state,
            "response_text": response_text,
            "messages": new_messages,
        }
    
    # Build the graph
    workflow = StateGraph(SessionState)
    
    # Add nodes
    workflow.add_node("analyze", analyze_explanation)
    workflow.add_node("respond", generate_response)
    
    # Define edges
    workflow.set_entry_point("analyze")
    workflow.add_edge("analyze", "respond")
    workflow.add_edge("respond", END)
    
    return workflow.compile()
