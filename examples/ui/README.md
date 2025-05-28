# Panda AGI SDK - Chat Interface

A modern React frontend for the Panda AGI SDK that provides a beautiful chat interface to interact with AI agents and visualize real-time streaming events.

## Features

- 🎨 **Modern Chat Interface**: Beautiful, responsive design with Tailwind CSS
- 🔄 **Real-time Event Streaming**: Live visualization of agent events via Server-Sent Events
- 🎯 **Event Type Recognition**: Different icons and colors for various event types
- 📱 **Mobile Responsive**: Works seamlessly on desktop and mobile devices
- ⚡ **Fast & Lightweight**: Built with React and optimized for performance

## Event Types Supported

The interface recognizes and beautifully renders various event types:

- **Connection Success** - Agent connection establishment
- **Tool Results** - Results from tool executions
- **Agent Requests** - Queries sent to the agent
- **Web Search** - Web search operations
- **Web Page Visits** - Page content retrieval
- **File Operations** - File read/write operations
- **User Messages** - Messages from users
- **Errors** - Error states and messages

## Project Structure

```
fastapi-server/
├── backend/
│   ├── main.py              # FastAPI server with streaming endpoints
│   └── workspace/           # Agent workspace directory
└── frontend/
    ├── src/
    │   ├── App.js          # Main chat interface component
    │   ├── App.css         # Custom styles
    │   └── index.css       # Tailwind CSS imports
    ├── package.json        # React dependencies
    └── tailwind.config.js  # Tailwind configuration
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Python 3.8+
- Docker (for the agent environment)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd fastapi-server/backend
```

2. Install Python dependencies:
```bash
pip install fastapi uvicorn
```

3. Start the FastAPI server:
```bash
python main.py
```

The backend will be available at `http://localhost:8001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd fastapi-server/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## Usage

1. **Start a Conversation**: Type your message in the input field at the bottom
2. **Send Messages**: Press Enter or click the send button
3. **View Events**: Watch real-time events stream in as the agent processes your request
4. **Event Details**: Each event shows:
   - Event type with appropriate icon
   - Source (input/output) badge
   - Timestamp
   - Relevant payload data
   - Status information

## API Endpoints

### POST /agent/run
Runs an agent with the given query and streams events.

**Request Body:**
```json
{
  "query": "Your question or command",
  "timeout": null
}
```

**Response:** Server-Sent Events stream with JSON data

### GET /health
Health check endpoint.

### GET /
API information and available endpoints.

## Event Stream Format

Events are streamed in Server-Sent Events format:

```
data: {"event_source": "output", "data": {"type": "tool_result", "id": "...", "payload": {...}, "timestamp": "...", "status": null}}
```

## Customization

### Styling
The interface uses Tailwind CSS for styling. You can customize:
- Colors in `tailwind.config.js`
- Component styles in `src/index.css`
- Custom animations in `src/App.css`

### Event Rendering
Add new event types by modifying the functions in `App.js`:
- `getEventIcon()` - Add icons for new event types
- `getEventColor()` - Add color schemes
- `renderEventPayload()` - Add custom rendering logic

## Development

### Running in Development Mode

1. Start the backend:
```bash
cd fastapi-server/backend && python main.py
```

2. In a new terminal, start the frontend:
```bash
cd fastapi-server/frontend && npm start
```

### Building for Production

```bash
cd fastapi-server/frontend
npm run build
```

The built files will be in the `build/` directory.

## Troubleshooting

### CORS Issues
The frontend includes a proxy configuration for development. For production, ensure CORS is properly configured in the FastAPI backend.

### Connection Issues
- Ensure the backend is running on port 8001
- Check that Docker is running for the agent environment
- Verify network connectivity between frontend and backend

### Event Parsing Errors
Events that don't match the expected JSON format will be logged to the console but won't break the interface.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the Panda AGI SDK. Please refer to the main project license. 