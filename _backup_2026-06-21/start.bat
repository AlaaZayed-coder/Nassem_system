@echo off
setlocal
cd /d "%~dp0"

echo.
echo Al Naseem Pricing System
echo ========================
echo.

set "NODE_CMD="
set "NPM_CMD="
set "NPM_JS="

if exist "%TEMP%\node-v20.19.5-win-x64\node.exe" (
  set "NODE_CMD=%TEMP%\node-v20.19.5-win-x64\node.exe"
  set "NPM_JS=%TEMP%\node-v20.19.5-win-x64\node_modules\corepack\dist\npm.js"
  set "PATH=%TEMP%\node-v20.19.5-win-x64;%PATH%"
)

if "%NODE_CMD%"=="" (
  where node >nul 2>nul
  if not errorlevel 1 (
    set "NODE_CMD=node"
  )
)

if "%NPM_JS%"=="" (
  where npm >nul 2>nul
  if not errorlevel 1 set "NPM_CMD=npm"
)

if "%NODE_CMD%"=="" (
  echo Node.js was not found.
  echo Please install Node.js LTS version 20 or 22, then run this file again.
  echo Download: https://nodejs.org/
  pause
  exit /b 1
)

if "%NPM_CMD%"=="" if "%NPM_JS%"=="" (
  echo npm was not found.
  echo Please install Node.js LTS version 20 or 22, then run this file again.
  echo Download: https://nodejs.org/
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing packages for the first time...
  if not "%NPM_JS%"=="" (
    "%NODE_CMD%" "%NPM_JS%" install
  ) else (
    call "%NPM_CMD%" install
  )
  if errorlevel 1 (
    echo Package installation failed.
    pause
    exit /b 1
  )
)

echo Building interface...
if not "%NPM_JS%"=="" (
  "%NODE_CMD%" "%NPM_JS%" run build
) else (
  call "%NPM_CMD%" run build
)
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo Opening browser: http://localhost:3000
start "" http://localhost:3000
echo.
echo Keep this window open while using the system.
echo To stop the system, close this window.
echo.

"%NODE_CMD%" server\index.js
pause
