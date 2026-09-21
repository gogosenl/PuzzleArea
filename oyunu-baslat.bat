@echo off
cd /d "%~dp0"
start "" /b python -m http.server 8000
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:8000/index.html"
