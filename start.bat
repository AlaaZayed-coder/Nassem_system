@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title نظام تسعير أصناف النسيم

echo.
echo  ==============================
echo   نظام تسعير اصناف النسيم
echo  ==============================
echo.

REM ─────────────────────────────────────────────────────────
REM  1. Find Node.js
REM ─────────────────────────────────────────────────────────
set "NODE="

REM Check temp folder (Claude Code installs node here)
if exist "%TEMP%\node-v20.19.5-win-x64\node.exe" (
  set "NODE=%TEMP%\node-v20.19.5-win-x64\node.exe"
  set "PATH=%TEMP%\node-v20.19.5-win-x64;%PATH%"
  goto :node_found
)

REM Check system PATH
where node >nul 2>nul
if not errorlevel 1 (
  set "NODE=node"
  goto :node_found
)

echo [خطأ] لم يتم العثور على Node.js
echo       حمّل Node.js من: https://nodejs.org/en/download
echo       ثم شغّل هذا الملف مرة أخرى.
pause
exit /b 1

:node_found
echo [OK] Node.js: %NODE%

REM ─────────────────────────────────────────────────────────
REM  2. Install packages (first run only)
REM ─────────────────────────────────────────────────────────
if not exist node_modules (
  echo.
  echo [جاري] تثبيت الحزم للمرة الاولى - انتظر...
  if exist "%TEMP%\node-v20.19.5-win-x64\node_modules\npm\bin\npm-cli.js" (
    "%NODE%" "%TEMP%\node-v20.19.5-win-x64\node_modules\npm\bin\npm-cli.js" install --prefer-offline
  ) else if exist "%TEMP%\node-v20.19.5-win-x64\node_modules\corepack\dist\npm.js" (
    "%NODE%" "%TEMP%\node-v20.19.5-win-x64\node_modules\corepack\dist\npm.js" install
  ) else (
    npm install
  )
  if errorlevel 1 (
    echo [خطأ] فشل تثبيت الحزم.
    pause
    exit /b 1
  )
  echo [OK] تم تثبيت الحزم.
)

REM ─────────────────────────────────────────────────────────
REM  3. Build frontend (skip if dist exists)
REM ─────────────────────────────────────────────────────────
if not exist client\dist\index.html (
  echo.
  echo [جاري] بناء الواجهة - انتظر...
  "%NODE%" node_modules\vite\bin\vite.js build
  if errorlevel 1 (
    echo [خطأ] فشل بناء الواجهة.
    pause
    exit /b 1
  )
  echo [OK] تم بناء الواجهة.
)

REM ─────────────────────────────────────────────────────────
REM  4. Start server then open browser
REM ─────────────────────────────────────────────────────────
echo.
echo [جاري] تشغيل الخادم...

REM Open browser after 3 seconds (in a separate cmd that exits after)
start "" /b cmd /c "timeout /t 3 /nobreak >nul 2>&1 && start http://localhost:3000"

echo.
echo  الرابط:  http://localhost:3000
echo  للإيقاف: اغلق هذه النافذة
echo.

REM Run server in foreground (keeps window alive = keeps server alive)
"%NODE%" server\index.js

echo.
echo [توقف] تم إيقاف الخادم.
pause
