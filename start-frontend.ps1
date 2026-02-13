# Start Frontend Server
# Run this in a dedicated terminal

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Mailguard Frontend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path "$PSScriptRoot\frontend"
npm run dev
