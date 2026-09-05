@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo  Digilians E-Learn - SAFE LOCAL START
echo ==============================================
echo.
echo Ordinary local start uses Windows PowerShell only.
echo Node.js is NOT required for START-LOCAL.bat.
echo.

set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS%" (
  echo ERROR: Windows PowerShell was not found. Localhost was NOT started.
  echo.
  pause
  exit /b 1
)

"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\windows-basic-check.ps1"
if errorlevel 1 (
  echo.
  echo BASIC CHECK FAILED. Localhost was NOT started.
  echo Review the FAIL lines above, then try again.
  echo.
  pause
  exit /b 1
)

echo.
echo Starting localhost...
echo If port 4173 is busy, the launcher will choose the next available port automatically.
echo.
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\windows-local-server.ps1"
set "CODE=%ERRORLEVEL%"
if not "%CODE%"=="0" (
  echo.
  echo LOCAL SERVER FAILED with exit code %CODE%.
  echo The window will stay open so you can read the error above.
  echo.
  pause
)
exit /b %CODE%
