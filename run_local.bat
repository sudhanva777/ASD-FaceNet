@echo off
echo ===== ASD-FaceNet Starting =====
echo.
echo [1/3] Checking Python venv...
if not exist "backend\venv" (
    echo Creating virtual environment...
    cd backend && python -m venv venv && cd ..
)
echo Checking for ONNX model...
if not exist "backend\storage\models\efficientnet_b0_asd.onnx" (
    echo WARNING: ONNX model not found! Run training first: cd training ^&^& python train.py ^&^& python export_onnx.py
)
echo [2/3] Starting Backend...
start "ASD-FaceNet Backend" cmd /k "cd backend && venv\Scripts\activate && pip install -r requirements.txt -q && python run.py"
echo Waiting for backend to start...
timeout /t 10 >nul
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Backend failed to start on port 8000. Check the backend window for details.
) else (
    echo Backend is running on port 8000.
)
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
