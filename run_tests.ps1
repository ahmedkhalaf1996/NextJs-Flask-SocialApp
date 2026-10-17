
<#
Run backend pytest tests and frontend Playwright E2E tests.
The Flask server starts automatically before frontend tests
and stops afterward if this script started it.
#>

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$ShowReport
)

$ErrorActionPreference = "Stop"

# ----------------------------------------------------
# Colour helpers
# ----------------------------------------------------

function Write-Header($msg) {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host " $msg" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
}

function Write-Success($msg) {
    Write-Host "[PASS] $msg" -ForegroundColor Green
}

function Write-Failure($msg) {
    Write-Host "[FAIL] $msg" -ForegroundColor Red
}

function Write-Info($msg) {
    Write-Host "[INFO] $msg" -ForegroundColor Yellow
}

# ----------------------------------------------------
# Paths
# ----------------------------------------------------

$ProjectRoot = $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"

$PythonExe = Join-Path $BackendDir "env\Scripts\python.exe"
$AppFile = Join-Path $BackendDir "app.py"

$BackendPort = 5000

$backendPassed = $true
$frontendPassed = $true
$backendProcess = $null

$StdOutLog = Join-Path $BackendDir "flask-test-stdout.log"
$StdErrLog = Join-Path $BackendDir "flask-test-stderr.log"

# ----------------------------------------------------
# Backend unit tests = pytest
# ----------------------------------------------------

if (-not $FrontendOnly) {
    Write-Header "Running Backend Tests (pytest)"

    if (-not (Test-Path $PythonExe)) {
        Write-Failure "Python virtual environment not found: $PythonExe"
        Write-Info "Create it with: python -m venv backend\env"
        $backendPassed = $false
    }
    else {
        Push-Location $BackendDir

        try {
            & $PythonExe -m pytest tests/ -v --tb=short

            if ($LASTEXITCODE -eq 0) {
                Write-Success "All backend tests passed."
            }
            else {
                Write-Failure "Backend tests failed (exit code $LASTEXITCODE)."
                $backendPassed = $false
            }
        }
        finally {
            Pop-Location
        }
    }
}

# ----------------------------------------------------
# Frontend E2E = Playwright
# Start Flask before running Playwright
# ----------------------------------------------------

if (-not $BackendOnly) {
    Write-Header "Starting Flask Backend for Playwright"

    if (-not (Test-Path $PythonExe)) {
        Write-Failure "Python virtual environment not found: $PythonExe"
        $frontendPassed = $false
    }
    elseif (-not (Test-Path $AppFile)) {
        Write-Failure "Flask app not found: $AppFile"
        $frontendPassed = $false
    }
    elseif (-not (Test-Path $FrontendDir)) {
        Write-Failure "Frontend directory not found: $FrontendDir"
        $frontendPassed = $false
    }
    else {
        try {
            # Check whether Flask is already listening on port 5000.
            $tcpClient = [System.Net.Sockets.TcpClient]::new()

            try {
                $tcpClient.Connect("127.0.0.1", $BackendPort)
                $serverAlreadyRunning = $tcpClient.Connected
            }
            catch {
                $serverAlreadyRunning = $false
            }
            finally {
                $tcpClient.Dispose()
            }

            if ($serverAlreadyRunning) {
                Write-Info "Backend is already running on port $BackendPort."
                Write-Info "Using the existing backend; it will not be stopped."
            }
            else {
                Write-Info "Starting python app.py..."

                $backendProcess = Start-Process `
                    -FilePath $PythonExe `
                    -ArgumentList "app.py" `
                    -WorkingDirectory $BackendDir `
                    -RedirectStandardOutput $StdOutLog `
                    -RedirectStandardError $StdErrLog `
                    -PassThru

                # Wait up to 30 seconds for Flask to start.
                $serverReady = $false

                for ($i = 0; $i -lt 60; $i++) {
                    Start-Sleep -Milliseconds 500

                    if ($backendProcess.HasExited) {
                        throw "Flask exited unexpectedly. Check $StdErrLog"
                    }

                    $tcpClient = [System.Net.Sockets.TcpClient]::new()

                    try {
                        $tcpClient.Connect("127.0.0.1", $BackendPort)
                        $serverReady = $tcpClient.Connected
                    }
                    catch {
                        $serverReady = $false
                    }
                    finally {
                        $tcpClient.Dispose()
                    }

                    if ($serverReady) {
                        break
                    }
                }

                if (-not $serverReady) {
                    throw "Flask did not start on port $BackendPort within 30 seconds. Check $StdErrLog"
                }

                Write-Success "Flask is running on http://127.0.0.1:$BackendPort"
            }

            # Run Playwright while Flask is running.
            Write-Header "Running Frontend E2E Tests (Playwright)"

            Push-Location $FrontendDir

            try {
                npm run test:e2e

                if ($LASTEXITCODE -eq 0) {
                    Write-Success "All frontend E2E tests passed."
                }
                else {
                    Write-Failure "Playwright failed (exit code $LASTEXITCODE)."
                    $frontendPassed = $false
                }
            }
            finally {
                Pop-Location
            }

            if ($ShowReport) {
                Write-Info "Opening Playwright HTML report..."

                Push-Location $FrontendDir

                try {
                    npm run test:e2e:report
                }
                finally {
                    Pop-Location
                }
            }
        }
        catch {
            Write-Failure $_.Exception.Message
            $frontendPassed = $false
        }
        finally {
            # Stop only the Flask process started by this script.
            if ($null -ne $backendProcess -and -not $backendProcess.HasExited) {
                Write-Info "Stopping the Flask process..."
                Stop-Process -Id $backendProcess.Id -Force
                Write-Success "Flask process stopped."
            }
        }
    }
}

# ----------------------------------------------------
# Summary
# ----------------------------------------------------

Write-Header "Test Summary"

if (-not $FrontendOnly) {
    if ($backendPassed) {
        Write-Success "Backend pytest: PASSED"
    }
    else {
        Write-Failure "Backend pytest: FAILED"
    }
}

if (-not $BackendOnly) {
    if ($frontendPassed) {
        Write-Success "Frontend Playwright: PASSED"
    }
    else {
        Write-Failure "Frontend Playwright: FAILED"
    }
}

Write-Host ""

if ($backendPassed -and $frontendPassed) {
    Write-Host "All requested test suites passed!" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "One or more test suites failed." -ForegroundColor Red
    exit 1
}
