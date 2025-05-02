@echo off
start cmd /k "cd backend && npm install && node server.js"
timeout /t 5
start cmd /k "cd frontend && npm install && npm start" 