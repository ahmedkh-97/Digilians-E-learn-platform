@echo off
setlocal
cd /d "%~dp0..\.."
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20+ is required for Preflight QA and is not available in PATH.
  echo Use START-LOCAL.bat for ordinary local testing without Node.js.
  pause
  exit /b 1
)
node tools\pre-deploy-check.mjs
set CODE=%ERRORLEVEL%
pause
exit /b %CODE%
