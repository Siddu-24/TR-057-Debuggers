@echo off
title SignSpeak AI - Flagship Portal
echo ==========================================
echo    SIGN SPEAK AI : WEB PORTAL ACTIVE
echo ==========================================
echo.
echo [1/1] Starting Signaling Server (Port 5000)...
echo.
echo To share with your friend, open a new CMD and run:
echo ngrok http 5000
echo ------------------------------------------
cd /d %~dp0video-call\server
node index.js
pause
