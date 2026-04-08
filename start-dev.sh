#!/bin/bash

echo "🚀 Starting Watershop Development Servers..."
echo ""

# Start backend in background
echo "📦 Starting Backend (NestJS) on port 4000..."
cd backend
npm run start:dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait a moment
sleep 2

# Start frontend in background
echo "🎨 Starting Frontend (Next.js) on port 3000..."
cd ../frontend
npm run dev > ../logs/frontend.log 2>&1 &
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

