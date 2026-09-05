@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo  Digilians E-Learn - QUICK CHECK
echo ==============================================

where node >nul 2>nul
if errorlevel 1 goto POWERSHELL_FALLBACK

node tools\quick-local-check.mjs
if errorlevel 1 (
  echo.
  echo QUICK CHECK FAILED.
  pause
  exit /b 1
)
echo.
echo QUICK CHECK PASS.
pause
exit /b 0

:POWERSHELL_FALLBACK
echo.
echo Node.js was not found. Running the Windows basic compatibility check instead.
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS%" (
  echo ERROR: Windows PowerShell was not found.
  pause
  exit /b 1
)
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\windows-basic-check.ps1"
set CODE=%ERRORLEVEL%
echo.
if "%CODE%"=="0" echo WINDOWS BASIC CHECK PASS. Full developer QA still requires Node.js 20+.
if not "%CODE%"=="0" echo WINDOWS BASIC CHECK FAILED.
pause
exit /b %CODE%
