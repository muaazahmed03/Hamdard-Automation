# Defense day — laptop par backend + phone ke liye URL
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host ""
Write-Host "========================================"
Write-Host "  UniFyp - Defense Day (local backend)"
Write-Host "========================================"
Write-Host ""

$ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object {
    $_.IPAddress -notmatch '^127\.' -and
    $_.IPAddress -notmatch '^169\.254\.' -and
    $_.PrefixOrigin -ne 'WellKnown'
  } |
  Select-Object -First 1 -ExpandProperty IPAddress

if ($ip) {
  Write-Host "  Phone app mein yeh URL likho:"
  Write-Host "  http://${ip}:3000" -ForegroundColor Green
  Write-Host ""
  Write-Host '  Login screen > "Defense day - connect to laptop server"'
  Write-Host "  Same Wi-Fi: laptop + phone dono connected hon."
  Write-Host ""
} else {
  Write-Host "  IP detect nahi hui. ipconfig se IPv4 dekho."
  Write-Host ""
}

Write-Host "  Backend start... Band karne ke liye Ctrl+C"
Write-Host ""

npm run dev:cmd
