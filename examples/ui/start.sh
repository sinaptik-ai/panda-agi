#!/bin/bash

# PandaAGI UI Startup Script
echo "🚀 Starting PandaAGI Enhanced Chat Interface..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker-compose down

# Clean up any orphaned containers
echo "🧹 Cleaning up..."
docker-compose down --remove-orphans

# Build and start the containers
echo "🔨 Building and starting containers..."
docker-compose up --build -d

# Wait for containers to be created
echo "⏳ Waiting for containers to initialize..."
sleep 15

# Check backend health
echo "🔍 Checking backend health..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost:8001/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy!"
        backend_healthy=true
        break
    fi
    echo "⏳ Backend not ready yet (attempt $attempt/$max_attempts)..."
    sleep 2
    attempt=$((attempt + 1))
done

# Check frontend health
echo "🔍 Checking frontend..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is accessible!"
    frontend_healthy=true
else
    echo "⚠️ Frontend may still be starting..."
    frontend_healthy=false
fi

# Final status check
if [ "$backend_healthy" = true ]; then
    echo ""
    echo "🎉 Services started successfully!"
    echo ""
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:8001"
    echo "📊 Health Check: http://localhost:8001/health"
    echo ""
    echo "📋 Useful commands:"
    echo "  View logs: docker-compose logs -f"
    echo "  Backend logs: docker-compose logs -f backend"
    echo "  Frontend logs: docker-compose logs -f frontend"
    echo "  Stop services: docker-compose down"
    echo "  Restart: docker-compose restart"
    echo ""
    if [ "$frontend_healthy" = false ]; then
        echo "⚠️ Frontend may take a few more moments to be ready"
    fi
    echo "🎯 Ready to chat with your AI agent!"
else
    echo ""
    echo "❌ Backend failed to start properly. Checking logs..."
    echo ""
    echo "Backend logs:"
    docker-compose logs backend
    echo ""
    echo "💡 Try running: docker-compose logs -f backend"
    exit 1
fi 