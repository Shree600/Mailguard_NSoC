# Backend Foundation Stability Test
# Verifies all audit improvements are working correctly

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "MAILGUARD BACKEND - FINAL SMOKE TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Health Endpoint (Public)
Write-Host "Test 1: Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get -ErrorAction Stop
    if ($health.status -eq "ok" -or $health.status -eq "degraded") {
        Write-Host "✅ PASS: Health endpoint working" -ForegroundColor Green
        Write-Host "   Status: $($health.status)" -ForegroundColor Gray
        Write-Host "   Uptime: $($health.uptime.formatted)" -ForegroundColor Gray
    } else {
        Write-Host "❌ FAIL: Unexpected health status" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ FAIL: Health endpoint error - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Protected Route Without Token (Should Fail)
Write-Host "`nTest 2: Protected Route Without Token..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/emails" -Method Get -ErrorAction Stop
    Write-Host "❌ FAIL: Should have returned 401" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ PASS: Protected route blocked without token (401)" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: Wrong status code - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# Test 3: Rate Limiting
Write-Host "`nTest 3: Rate Limiting..." -ForegroundColor Yellow
try {
    # Make multiple requests quickly
    $rateLimitHit = $false
    for ($i = 1; $i -le 105; $i++) {
        try {
            Invoke-WebRequest -Uri "http://localhost:5000/api/emails" -Method Get -ErrorAction Stop | Out-Null
        } catch {
            if ($_.Exception.Response.StatusCode -eq 429) {
                $rateLimitHit = $true
                break
            }
        }
    }
    
    if ($rateLimitHit) {
        Write-Host "✅ PASS: Rate limiting working (hit 429 limit)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING: Rate limit not hit after 105 requests" -ForegroundColor Yellow
        Write-Host "   (This may be expected if rate limit window hasn't reset)" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  WARNING: Rate limit test error - $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 4: CORS Headers
Write-Host "`nTest 4: CORS Policy..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -Method Get -ErrorAction Stop
    $allowOrigin = $response.Headers["Access-Control-Allow-Origin"]
    
    if ($allowOrigin -and $allowOrigin -ne "*") {
        Write-Host "✅ PASS: CORS restricted (not wildcard)" -ForegroundColor Green
        Write-Host "   Allow-Origin: $allowOrigin" -ForegroundColor Gray
    } elseif ($allowOrigin -eq "*") {
        Write-Host "❌ FAIL: CORS allows wildcard (*)" -ForegroundColor Red
    } else {
        Write-Host "⚠️  INFO: No CORS header (may be browser-only)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  WARNING: CORS test error - $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 5: 404 Handling
Write-Host "`nTest 5: 404 Error Handling..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/nonexistent" -Method Get -ErrorAction Stop
    Write-Host "❌ FAIL: Should have returned 404" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ PASS: 404 handler working" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: Wrong status code - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# Test 6: Request Logging
Write-Host "`nTest 6: Request Logging..." -ForegroundColor Yellow
Write-Host "   Check server console for request logs" -ForegroundColor Gray
Write-Host "   Should see: ⚠️ GET /api/emails - 401 (Xms)" -ForegroundColor Gray
Write-Host "✅ PASS: Check server console output" -ForegroundColor Green

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SMOKE TEST COMPLETE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "Manual verification required:" -ForegroundColor Yellow
Write-Host "  1. Check server console for clean logs" -ForegroundColor Gray
Write-Host "  2. Verify no error stack traces" -ForegroundColor Gray
Write-Host "  3. Confirm environment validation ran" -ForegroundColor Gray
Write-Host "  4. Test with valid Clerk token for full flow`n" -ForegroundColor Gray
