# PandaAGI SDK - Enhanced Chat Interface

A modern React frontend for the PandaAGI SDK that provides a beautiful chat interface to interact with AI agents and visualize real-time streaming events. **Now enhanced with improved event handling and filtering!**

> **🚀 Quick Start:** `cd examples/ui && ./start.sh` - One command to run everything with Docker!

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

## 🚀 Quick Start

### Production Mode (Default - uses pre-built images)

```bash
# Start using pre-built production images (default)
./start.sh

# Force pull latest production images
./start.sh --build
```

### Development Mode (local builds)

```bash
# Start in development mode (builds images locally)
./start.sh --dev

# Force rebuild of local images
./start.sh --dev --build
```

## 🐳 Docker Setup

### Development with Docker Compose

The easiest way to run the PandaAGI Enhanced Chat Interface is using Docker Compose, which handles all dependencies and configuration automatically.

#### Quick Start with Docker

Use the provided start script for one-command setup:

```bash
cd examples/ui
chmod +x start.sh
./start.sh
```

This script will:

- ✅ Check Docker requirements
- 🛑 Stop any existing containers
- 🔨 Build and start both services
- 🔍 Perform health checks
- 📊 Display service status and URLs

### Manual Docker Setup

If you prefer manual control:

```bash
cd examples/ui

# Build and start all services
docker-compose up --build -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Service URLs

Once running, access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **Health Check**: http://localhost:8001/health

### Container Architecture

The Docker setup includes:

- **Backend**: Python FastAPI server with PandaAGI SDK integration
- **Frontend**: React app served via Nginx with API proxying
- **Networking**: Internal Docker network for service communication
- **Volume Mounts**: SDK source code and workspace directory

### Docker Troubleshooting

**Backend not starting:**

```bash
# Check backend logs
docker-compose logs backend

# Verify panda_agi installation
docker-compose exec backend pip list | grep panda-agi
```

**Frontend connection issues:**

```bash
# Check frontend logs
docker-compose logs frontend

# Test API connectivity
curl http://localhost:8001/health
```

**Complete reset:**

```bash
# Stop and clean everything
docker-compose down --volumes --remove-orphans
docker system prune -f

# Rebuild from scratch
docker-compose up --build
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher) - _for local development_
- Python 3.8+ - _for local development_
- Docker & Docker Compose - _for containerized deployment_

### 🔧 Local Development Setup

If you prefer to run the services locally for development:

#### Backend Setup

1. Navigate to the backend directory:

```bash
cd examples/ui/backend
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

#### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd examples/ui/frontend
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

### 🐳 Advanced Docker Usage

#### Building Individual Containers

**Backend only:**

```bash
cd examples/ui/backend
docker build -t panda-agi-backend .
docker run -p 8001:8001 panda-agi-backend
```

**Frontend only:**

```bash
cd examples/ui/frontend
docker build -t panda-agi-frontend .
docker run -p 3000:80 panda-agi-frontend
```

#### Production Deployment

For production deployment, you can use the same Docker Compose setup:

```bash
# Pull latest changes
# Pull latest changes
git pull origin main

# Rebuild and restart containers in development mode
./start.sh --build

# Or in production mode
./start.sh --prod

# View logs
docker-compose logs -f
```

#### Container Management

**View running containers:**

```bash
docker-compose ps
```

**View logs:**

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

**Restart services:**

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

**Clean up:**

```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Remove containers, volumes, and images
docker-compose down -v --rmi all
```

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
data: {"data": {"type": "tool_result", "id": "...", "payload": {...}, "timestamp": "...", "status": null}}
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

### Docker Issues

**Containers won't start:**

```bash
# Check if ports are already in use
netstat -tulpn | grep :3000
netstat -tulpn | grep :8001

# Check Docker logs
docker-compose logs backend
docker-compose logs frontend
```

**Frontend can't connect to backend:**

- Ensure both containers are running: `docker-compose ps`
- Check if backend is healthy: `curl http://localhost:8001/health`
- Verify network connectivity: `docker-compose logs frontend`

**Build failures:**

```bash
# Clean Docker cache and rebuild
docker system prune -f
docker-compose build --no-cache
```

**Permission issues with workspace:**

```bash
# Fix workspace permissions
sudo chown -R $USER:$USER ./backend/workspace
```

### Local Development Issues

**CORS Issues:**
The frontend includes a proxy configuration for development. For production, ensure CORS is properly configured in the FastAPI backend.

**Connection Issues:**

- Ensure the backend is running on port 8001
- Check that Docker is running for the agent environment
- Verify network connectivity between frontend and backend

**Event Parsing Errors:**
Events that don't match the expected JSON format will be logged to the console but won't break the interface. The enhanced error handling provides graceful fallbacks.

**StreamEvent Compatibility:**
If you encounter issues with event handling, ensure you're using the latest version of the PandaAGI SDK that supports StreamEvent objects.

### Performance Issues

**Slow container startup:**

- Increase Docker memory allocation in Docker Desktop settings
- Use `docker-compose up -d` to run in detached mode

**High memory usage:**

- Monitor container resource usage: `docker stats`
- Restart containers if needed: `docker-compose restart`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the PandaAGI SDK. Please refer to the main project license.
