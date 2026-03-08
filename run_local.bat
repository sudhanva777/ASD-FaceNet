@echo off
echo ===== ASD-FaceNet Starting =====
echo.
echo [1/3] Checking Python venv...
if not exist "backend\venv" (
    echo Creating virtual environment...
    cd backend && python -m venv venv && cd ..
)
echo [2/3] Starting Backend...
start "ASD-FaceNet Backend" cmd /k "cd backend && venv\Scripts\activate && pip install -r requirements.txt -q && python run.py"
timeout /t 5 >nul
echo [3/3] Starting Frontend...
start "ASD-FaceNet Frontend" cmd /k "cd frontend && npm install && npm run dev"
timeout /t 4 >nul
start http://localhost:5173
echo.
echo ===== ASD-FaceNet is running! =====
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
pause
