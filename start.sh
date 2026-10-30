#!/usr/bin/env bash
# VoltTrace Full-Stack Startup Script

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo "  VoltTrace — Digital Battery Passport & Triage Engine   "
echo "=========================================================="

# 1. Start Python FastAPI Backend
echo "Starting FastAPI Backend on http://127.0.0.1:8000..."
cd "$DIR/backend"
PYTHONPATH=. .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# 2. Start React + Vite Frontend
echo "Starting Vite Frontend on http://localhost:5173..."
cd "$DIR/frontend"
npm run dev -- --host &
FRONTEND_PID=$!

cleanup() {
    echo ""
    echo "Shutting down VoltTrace services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

echo ""
echo "VoltTrace is running!"
echo "  → Frontend Dashboard: http://localhost:5173"
echo "  → Interactive API Docs: http://127.0.0.1:8000/api/v1/docs"
echo ""
echo "Press Ctrl+C to stop all services."

wait
