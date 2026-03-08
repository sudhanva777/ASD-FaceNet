#!/bin/bash
set -e

echo "===== ASD-FaceNet Starting ====="
echo ""

# Backend
echo "[1/3] Checking Python venv..."
if [ ! -d "backend/venv" ]; then
    echo "Creating virtual environment..."
    cd backend && python3 -m venv venv && cd ..
fi

echo "[2/3] Starting Backend..."
(cd backend && source venv/bin/activate && pip install -r requirements.txt -q && python run.py) &
BACKEND_PID=$!
sleep 4

echo "[3/3] Starting Frontend..."
(cd frontend && npm install --silent && npm run dev) &
FRONTEND_PID=$!
sleep 3

# Open browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173
elif command -v open &> /dev/null; then
    open http://localhost:5173
fi

echo ""
echo "===== ASD-FaceNet is running! ====="
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
