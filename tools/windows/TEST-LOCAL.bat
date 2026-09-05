@echo off
setlocal
cd /d "%~dp0..\.."
echo ==============================================
echo  Digilians E-Learn - FULL LOCAL TEST
echo ==============================================
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js 20+ is required for Full QA and is not available in PATH.
  echo Use START-LOCAL.bat for ordinary local testing without Node.js.
  pause
  exit /b 1
)
node tools\pre-deploy-check.mjs
if errorlevel 1 (
  echo.
  echo PRE-DEPLOY FAILED. Localhost was NOT started.
  pause
  exit /b 1
)
echo.
echo Full QA PASS. Starting localhost for manual acceptance...
node tools\local-server.mjs
