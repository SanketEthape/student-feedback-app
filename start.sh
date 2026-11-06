#!/usr/bin/env bash
# ==============================================================================
# EduPulse - Project Submission One-Click Launcher (Linux / macOS)
# Works whether run from /mp1 or inside /student-feedback-app
# ==============================================================================

echo "========================================================"
echo "    Starting EduPulse Portal (Backend & Frontend)       "
echo "========================================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -d "$SCRIPT_DIR/backend" ]; then
    PROJECT_DIR="$SCRIPT_DIR"
elif [ -d "$SCRIPT_DIR/student-feedback-app/backend" ]; then
    PROJECT_DIR="$SCRIPT_DIR/student-feedback-app"
else
    echo "[ERROR] Cannot locate backend directory."
    exit 1
fi

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in PATH."
    echo "Please install Node.js (v18+) to run this project."
    read -p "Press Enter to exit..."
    exit 1
fi

echo "[1/3] Starting Backend Server on port 5000..."
cd "$PROJECT_DIR/backend"
node server.js &
BACKEND_PID=$!

# Trap Ctrl+C and exit to kill background processes gracefully
cleanup() {
    echo ""
    echo "Shutting down EduPulse services..."
    kill $BACKEND_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

sleep 2

echo "[2/3] Starting Frontend Application..."
cd "$PROJECT_DIR/frontend"
if [ -d "dist" ]; then
    echo "Serving production build..."
    npx --yes serve -s dist -l 5173 &
else
    echo "Starting Vite dev server..."
    npm run dev &
fi

sleep 3
echo "[3/3] Opening EduPulse in browser (http://localhost:5173)..."
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:5173" &
elif command -v open &> /dev/null; then
    open "http://localhost:5173" &
fi

echo "========================================================"
echo "  EduPulse is running! Press Ctrl+C in this window to stop."
echo "  Frontend : http://localhost:5173"
echo "  Backend  : http://localhost:5000"
echo "========================================================"

wait
