@echo off
setlocal
cd /d "%~dp0..\.."
echo ==============================================
echo  Digilians E-Learn - FULL QA ONLY
echo ==============================================
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js 20+ is required for Full QA and is not available in PATH.
  echo START-LOCAL.bat can still run the platform using Windows PowerShell.
  pause
  exit /b 1
)
node tools\pre-deploy-check.mjs
set CODE=%ERRORLEVEL%
echo.
if not "%CODE%"=="0" echo FULL QA FAILED.
if "%CODE%"=="0" echo FULL QA PASS.
pause
exit /b %CODE%
