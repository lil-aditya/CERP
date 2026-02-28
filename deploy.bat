@echo off
REM CERP Deployment Script for Windows
REM Usage: deploy.bat [development|production|docker]

SET MODE=%1
IF "%MODE%"=="" SET MODE=development

echo.
echo ========================================
echo  CERP Deployment - Mode: %MODE%
echo ========================================
echo.

IF "%MODE%"=="development" GOTO development
IF "%MODE%"=="production" GOTO production
IF "%MODE%"=="docker" GOTO docker
GOTO unknown

:development
echo Starting development servers...
echo.

REM Start backend in new window
start "CERP Backend" cmd /k "cd backend && npm install && npm run dev"

REM Start frontend in new window
start "CERP Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo.
echo [OK] Development servers starting!
echo     Frontend: http://localhost:3000
echo     Backend:  http://localhost:5000
echo.
echo Close the terminal windows to stop the servers.
GOTO end

:production
echo Building for production...
echo.

REM Build frontend
cd frontend
call npm ci
call npm run build
echo [OK] Frontend built to ./frontend/dist
cd ..

REM Prepare backend
cd backend
call npm ci --only=production
echo [OK] Backend dependencies installed
cd ..

echo.
echo [OK] Production build complete!
echo     - Frontend static files: .\frontend\dist
echo     - Backend ready: cd backend ^&^& npm start
GOTO end

:docker
echo Building Docker containers...
echo.

IF NOT EXIST .env (
    echo [!] No .env file found. Copying from .env.example...
    copy .env.example .env
    echo     Please edit .env with your configuration!
)

docker-compose build

echo.
echo [OK] Docker images built!
echo.
echo To start:
echo     Development: docker-compose up
echo     Production:  docker-compose --profile production up -d
GOTO end

:unknown
echo Unknown mode: %MODE%
echo Usage: deploy.bat [development^|production^|docker]
exit /b 1

:end
echo.
