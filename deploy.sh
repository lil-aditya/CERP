#!/bin/bash
# CERP Deployment Script
# Usage: ./deploy.sh [development|production|docker]

set -e

MODE=${1:-development}

echo "🚀 CERP Deployment - Mode: $MODE"
echo "=================================="

case $MODE in
  development)
    echo "Starting development servers..."
    
    # Start backend
    cd backend
    npm install
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    # Start frontend
    cd frontend
    npm install
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    echo "✅ Development servers running!"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:5000"
    echo ""
    echo "Press Ctrl+C to stop..."
    
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
    wait
    ;;
    
  production)
    echo "Building for production..."
    
    # Build frontend
    cd frontend
    npm ci
    VITE_API_URL=$VITE_API_URL npm run build
    echo "✅ Frontend built to ./frontend/dist"
    cd ..
    
    # Prepare backend
    cd backend
    npm ci --only=production
    echo "✅ Backend dependencies installed"
    cd ..
    
    echo ""
    echo "✅ Production build complete!"
    echo "   - Frontend static files: ./frontend/dist"
    echo "   - Backend ready to start: cd backend && npm start"
    ;;
    
  docker)
    echo "Building Docker containers..."
    
    if [ ! -f .env ]; then
      echo "⚠️  No .env file found. Copying from .env.example..."
      cp .env.example .env
      echo "   Please edit .env with your configuration!"
    fi
    
    docker-compose build
    echo ""
    echo "✅ Docker images built!"
    echo ""
    echo "To start:"
    echo "   Development: docker-compose up"
    echo "   Production:  docker-compose --profile production up -d"
    ;;
    
  *)
    echo "Unknown mode: $MODE"
    echo "Usage: ./deploy.sh [development|production|docker]"
    exit 1
    ;;
esac
