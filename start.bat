@echo off
title AI Speaking Assistant - Startup
echo.
echo  ================================
echo   AI Speaking Assistant
echo   Starting Backend + Frontend...
echo  ================================
echo.

:: Start Flask Backend (now lives inside projecct/backend)
echo [1/2] Starting Backend (Flask) on port 5000...
start "Backend - Flask" cmd /k "cd /d D:\projecct\backend && python app.py"
timeout /t 3 /nobreak >nul

:: Start Angular Frontend
echo [2/2] Starting Frontend (Angular) on port 4200...
start "Frontend - Angular" cmd /k "cd /d D:\projecct && ng serve --open"

echo.
echo  Backend  : http://localhost:5000
echo  Frontend : http://localhost:4200
echo.
echo  รอสักครู่แล้วเบราว์เซอร์จะเปิดอัตโนมัติ...
echo.
pause
