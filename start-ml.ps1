# Start ML Service
# Run this in a dedicated terminal

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Mailguard ML Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path "$PSScriptRoot\ml-service"
python app.py
