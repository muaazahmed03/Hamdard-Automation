@echo off
chcp 65001 >nul
cd /d "%~dp0.."

echo.
echo ========================================
echo   UniFyp - Defense Day (local backend)
echo ========================================
echo.

set FOUND=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  if not defined FOUND (
    set "IP=%%a"
    set FOUND=1
  )
)

if defined IP (
  for /f "tokens=* delims= " %%b in ("%IP%") do set IP=%%b
  echo   Phone app mein yeh URL likho:
  echo   http://%IP%:3000
  echo.
  echo   Login screen ^> "Defense day - connect to laptop server"
  echo   Same Wi-Fi: laptop + phone dono connected hon.
  echo.
) else (
  echo   IP detect nahi hui. ipconfig se IPv4 dekho.
  echo.
)

echo   Backend start ho raha hai... Band karne ke liye Ctrl+C
echo.

call npm run dev:cmd
