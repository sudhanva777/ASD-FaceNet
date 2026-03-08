@echo off
echo ===== Stopping ASD-FaceNet =====
echo.
echo Killing backend (Python/uvicorn)...
taskkill /F /FI "WINDOWTITLE eq ASD-FaceNet Backend*" >nul 2>&1
taskkill /F /IM python.exe /FI "WINDOWTITLE eq ASD-FaceNet*" >nul 2>&1
echo Killing frontend (Node/npm)...
taskkill /F /FI "WINDOWTITLE eq ASD-FaceNet Frontend*" >nul 2>&1
taskkill /F /IM node.exe /FI "WINDOWTITLE eq ASD-FaceNet*" >nul 2>&1
echo.
echo ===== ASD-FaceNet Stopped =====
pause
