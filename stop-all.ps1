# Stop All Running Services
# Run this to kill all Mailguard processes

Write-Host "========================================" -ForegroundColor Red
Write-Host "  Stopping All Mailguard Services" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# Stop Node.js processes (backend, frontend)
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force
    Write-Host "✓ Node.js processes stopped" -ForegroundColor Green
} else {
    Write-Host "No Node.js processes running" -ForegroundColor Gray
}

# Stop Python processes (ML service)
$pythonProcesses = Get-Process -Name python -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    Write-Host "Stopping Python processes..." -ForegroundColor Yellow
    $pythonProcesses | Stop-Process -Force
    Write-Host "✓ Python processes stopped" -ForegroundColor Green
} else {
    Write-Host "No Python processes running" -ForegroundColor Gray
}

Write-Host ""
Write-Host "All services stopped!" -ForegroundColor Green
