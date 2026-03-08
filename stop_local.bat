@echo off
echo ===== Stopping ASD-FaceNet =====
echo.
echo Killing backend (Python/uvicorn)...
taskkill /F /FI "WINDOWTITLE eq ASD-FaceNet Backend*" >nul 2>&1
taskkill /F /IM python.exe /FI "WINDOWTITLE eq ASD-FaceNet*" >nul 2>&1
echo Killing any orphaned Python processes on port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do taskkill /F /PID %%a >nul 2>&1
echo Killing frontend (Node/npm)...
taskkill /F /FI "WINDOWTITLE eq ASD-FaceNet Frontend*" >nul 2>&1
taskkill /F /IM node.exe /FI "WINDOWTITLE eq ASD-FaceNet*" >nul 2>&1
echo.
echo ===== ASD-FaceNet Stopped =====
pause
