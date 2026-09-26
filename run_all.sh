#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  NTRO Bitcoin Traffic Monitoring & Analysis System       "
echo "  SIH26146 - Blockchain & Cybersecurity Platform         "
echo "=========================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# 1. Activate Virtual Environment
if [ -d "backend/venv" ]; then
    source backend/venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Creating Python virtual environment in backend/venv..."
    python3 -m venv backend/venv
    source backend/venv/bin/activate
    pip install -r backend/requirements.txt
fi

# 2. Check / Seed initial synthetic dataset if empty
echo "Ensuring synthetic datasets exist..."
python -m backend.app.data_generator

# 3. Start Backend API
echo "Starting FastAPI Backend Server on port 8000..."
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Trap signals to clean up background processes
trap "echo 'Stopping servers...'; kill $BACKEND_PID 2>/dev/null || true; exit" SIGINT SIGTERM EXIT

# Wait for backend to be ready
echo "Waiting for Backend to start..."
sleep 2

# 4. Start Frontend
echo "Starting Frontend Dev Server on port 5173..."
cd frontend
npm run dev

# Wait for child process
wait $BACKEND_PID
