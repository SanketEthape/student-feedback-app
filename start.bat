@echo off
REM ==============================================================================
REM EduPulse - Project Submission One-Click Launcher (Windows)
REM Works whether run from root or inside student-feedback-app
REM ==============================================================================

echo ========================================================
echo     Starting EduPulse Portal (Backend ^& Frontend)       
echo ========================================================

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not found in PATH.
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

set SCRIPT_DIR=%~dp0
if exist "%SCRIPT_DIR%backend" (
    set BASE_DIR=%SCRIPT_DIR%
) else (
    set BASE_DIR=%SCRIPT_DIR%student-feedback-app\
)

echo [1/3] Starting Backend Server on port 5000...
cd /d "%BASE_DIR%backend"
start "EduPulse Backend" cmd /c "node server.js"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Frontend Server...
cd /d "%BASE_DIR%frontend"
if exist "dist" (
    start "EduPulse Frontend" cmd /c "npx --yes serve -s dist -l 5173"
) else (
    start "EduPulse Frontend" cmd /c "npm run dev"
)

timeout /t 3 /nobreak >nul

echo [3/3] Opening EduPulse in browser (http://localhost:5173)...
start http://localhost:5173

echo ========================================================
echo  EduPulse is running!
echo  Frontend : http://localhost:5173
echo  Backend  : http://localhost:5000
echo ========================================================
echo  Close the popup command windows to stop the servers.
pause
