#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/logs"
BACKEND_ENV_FILE="$ROOT_DIR/backend/.env.local"
FRONTEND_ENV_FILE="$ROOT_DIR/frontend/.env.local"

if [[ ! -f "$BACKEND_ENV_FILE" ]]; then
	echo "Missing backend/.env.local. Copy backend/.env.example first."
	exit 1
fi

if [[ ! -f "$FRONTEND_ENV_FILE" ]]; then
	echo "Missing frontend/.env.local. Copy frontend/.env.example first."
	exit 1
fi

mkdir -p "$LOG_DIR"

echo "🚀 Starting Watershop Development Servers..."
echo ""

# Start backend in background with env.local-aware loader
echo "📦 Starting Backend (NestJS) on port 4000..."
cd "$ROOT_DIR/backend"
npm run start:local > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait a moment
sleep 2

# Start frontend in background with frontend/.env.local
echo "🎨 Starting Frontend (Next.js) on port 3000..."
cd "$ROOT_DIR/frontend"
npm run start:local > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ Servers started!"
echo ""
echo "📍 URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:4000"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f logs/backend.log"
echo "   Frontend: tail -f logs/frontend.log"
echo ""
echo "⏹️  To stop: kill $BACKEND_PID $FRONTEND_PID"

