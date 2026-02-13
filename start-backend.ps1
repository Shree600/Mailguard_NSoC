# Start Backend Server
# Run this in a dedicated terminal

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Mailguard Backend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path "$PSScriptRoot\backend"
node server.js
