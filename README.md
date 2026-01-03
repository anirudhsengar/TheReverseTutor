# The Reverse Tutor

## Abstract

The Reverse Tutor is an AI-powered pedagogical assistant designed to implement the Feynman Technique through interactive Socratic dialogue. Unlike traditional educational tools that provide direct answers, this system acts as a knowledgeable adversary, challenging users to articulate their understanding of complex concepts. By probing for gaps in knowledge and asking recursive "why" questions, the system fosters deep conceptual mastery and active recall.

## Demo (Video)

<video src="./TheReverseTutorDemo.mp4" controls width="720"></video>

The demo captures the AI model speaking in response to a human prompt: "Artificial Intelligence and Machine Learning are a result of availability of data, advancement in algorithms, and hardware advancements like GPU." The clip showcases the full voice pipeline (STT → reasoning → TTS) running end to end.

## System Architecture

The application requires a seamless real-time interaction model effectively implemented through a decoupled client-server architecture.

### Frontend
The user interface is a Single Page Application (SPA) built with **React 19** and **Vite**, prioritizing performance and component modularity.
- **State Management**: React Hooks facilitate local state management for audio recording status and WebSocket connectivity.
- **Styling**: **TailwindCSS** provides a utility-first approach to styling, ensuring a consistently responsive and compliant design system.
- **Real-Time Communication**: A persistent WebSocket connection handles the bidirectional stream of audio data and text payloads.

### Backend
The server-side logic is powered by **FastAPI**, an asynchronous web framework chosen for its high throughput and native support for Python type hinting.
- **Agentic Workflow**: The core conversational logic is orchestrated using **LangGraph**. The system operates as a finite state machine with nodes for Analysis, Decision, and Generation, allowing for complex, multi-step reasoning before responding to the user.
- **Audio Processing Pipeline**:
    - **Input (STT)**: Audio streams are processed via **Deepgram Nova-2**, ensuring industry-leading transcription speed and accuracy.
    - **Output (TTS)**: Response synthesis utilizes **Edge TTS**, offering high-quality, natural-sounding speech with minimal latency.

## Technology Stack

### Core Technologies
- **Python 3.11**
- **Node.js 18+**
- **FastAPI**: Backend API framework
- **React**: UI library
- **Vite**: Frontend build tool
- **LangChain / LangGraph**: Orchestration framework for LLM agents

### AI and Data Services
- **Deepgram SDK**: Real-time Speech-to-Text
- **Groq / OpenAI**: Inference providers for Large Language Models (Llama 3, GPT-4)
- **Tavily AI**: Autonomous web search for fact verification

## Key Features

- **Socratic Logic Engine**: A custom prompt engineering strategy that enforces a strict distinctive pedagogical role, preventing the model from reverting to a standard assistant persona.
- **Edge TTS**: Text-to-Speech synthesis
- **Strict Turn-Taking Interface**: A robust Voice Activity Detection (VAD) system that intelligently manages the conversation flow, preventing interruptions while the agent is thinking or speaking.
- **Context Awareness**: The LangGraph state schema maintains a persistent memory of the current teaching session, allowing the agent to reference previous user statements.
- **Robust Error Handling**: Comprehensive try-catch blocks and feedback loops for API failures (e.g., TTS generation errors).

## Installation and Setup

### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher
- API Keys for Deepgram, and either OpenAI or Groq

### 1. Repository Setup
Clone the repository and configure the environment variables.

```bash
git clone https://github.com/anirudhsengar/TheReverseTutor.git
cd TheReverseTutor
cp .env.example .env
```

### 2. Backend Configuration
Initialize the Python virtual environment and install dependencies.

```bash
cd backend
python -m venv venv
# Linux/MacOS
source venv/bin/activate
# Windows
# venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Frontend Configuration
Install the necessary Node.js packages.

```bash
cd ../frontend
npm install
```

## Usage

To run the application locally, execute the backend and frontend services in separate terminal sessions.

**Terminal 1 (Backend)**
```bash
cd backend
python main.py
```

**Terminal 2 (Frontend)**
```bash
cd frontend
npm run dev
```

Access the application interface at `http://localhost:5173`.

### CLI Testing
For rapid testing of the agentic logic without the frontend overhead, use the command-line interface.

```bash
cd backend
python -m agent.cli
```

## Configuration Reference

The application is configured via the `.env` file. Ensure the following variables are set.

| Variable | Description | Requirement |
|:---|:---|:---|
| `GROQ_API_KEY` | API Key for Groq inference (Llama models) | Required |
| `OPENAI_API_KEY` | API Key for OpenAI inference (GPT models) | Optional |
| `DEEPGRAM_API_KEY` | API Key for Deepgram Speech-to-Text | Required |
| `TAVILY_API_KEY` | API Key for Tavily Search | Optional |
| `LLM_PROVIDER` | Selector for model provider (`groq` or `openai`) | Default: `groq` |

## Project Structure

```text
TheReverseTutor/
├── backend/
│   ├── main.py              # Application entry point
│   ├── config.py            # Environment configuration
│   ├── agent/               # Agentic logic
│   │   ├── graph.py         # LangGraph state definition
│   │   └── prompts.py       # System prompts
│   └── audio/               # Audio processing modules
│       ├── stt.py           # Deepgram integration
│       └── tts.py           # Edge TTS integration
├── frontend/
│   ├── src/
│   │   ├── components/      # React UI components
│   │   └── hooks/           # Custom React hooks
└── .env.example             # Configuration template
```

## License

This project is licensed under the MIT License.
