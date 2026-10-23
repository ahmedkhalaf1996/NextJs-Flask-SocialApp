@echo off 
setlocal EnableDelayedExpansion

rem ==================================================
rem deploy.bat -- tinteractive k8s deploy script for social app 
rem ==================================================

set "REPO_ROOT=%~dp0"
set "K8S_DIR=%REPO_ROOT%k8s"
set "GITHUB_REPO=ahmedkhalaf1996/NextJs-Flask-SocialApp"

rem ==================================================
rem Social App -- K8S DEPLOY
rem ==================================================

rem --- preflight --------

where git >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] git is not installed or not in PATH
    pause
    exit /b 1
)


where kubectl >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] kubectl is not installed or not in PATH
    pause
    exit /b 1
)


echo [OK] git and kubectl found.
echo.


rem --- Step 1:Ask For version --------

echo What vesion do you want to deploy?
echo Use semantic versioning e.g. v1.0.0 or v2.3.1
echo.

set /p VERSION="enter version tag: "

rem --- Trim leading and trailing whitespace --------
for /f "tokens=* delims= " %%a in ("%VERSION%") do set  VERSION=%%a

powershell -NoProfile -Command "if ('%VERSION%' -notmatch '^v\d+\.\d+\.\d+$') { exit 1 }"
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Invalid format. Must be like v1.2.0
    pause & exit /b 1
)

echo [OK] Version: %VERSION%
echo.

rem --- Step 2:Update image tags --------

echo ===============================================
echo Step 1 -- Updating k8s image tags
echo ===============================================
echo.

set "BACKEND_DEPLOY=%K8S_DIR%\backend\deployment.yaml"
set "FRONTEND_DEPLOY=%K8S_DIR%\frontend\deployment.yaml"

echo [INFO] Updating backend mainfest...

powershell -NoProfile -Command "(Get-Content '%BACKEND_DEPLOY%') -replace 'image: ahmedkhalaf666/next-flask-social-backend:.*', 'image: ahmedkhalaf666/next-flask-social-backend:%VERSION%' | Set-Content '%BACKEND_DEPLOY%'"
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Failed to update backend manifest.
    pause & exit /b 1
)



echo [INFO] Updating frontend manifest...

powershell -NoProfile -Command "(Get-Content '%FRONTEND_DEPLOY%') -replace 'image: ahmedkhalaf666/next-flask-social-frontend:.*', 'image: ahmedkhalaf666/next-flask-social-frontend:%VERSION%' | Set-Content '%FRONTEND_DEPLOY%'"
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Failed to update frontend manifest.
    pause & exit /b 1
)


echo [OK] Image tags updated to %VERSION%.
echo.

rem ── Step 3: Git commit + push ────────────────────────────────────────────────
echo ==========================================
echo   Step 2 -- Committing and pushing
echo ==========================================
echo.

cd /d "%REPO_ROOT%"

git add .


rem Capture staged status into a variable (reliable in batch)
git diff --cached --quiet
set STAGED=!ERRORLEVEL!

if !STAGED! NEQ 0 (
    git commit -m "chore: bump k8s image tags to %VERSION%"
    echo [OK] Committed App changes.
) else (
    echo [WARN] No changes to commit
)

git push origin HEAD
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] git push failed. Check your credentials and branch.
    pause & exit /b 1
)

echo.
echo [OK] Pushed to GitHub.
echo     The "Build and Push Docker Images" action is now running.
echo.

rem ── Step 4: Wait for GitHub Actions ──────────────────────────────────────────
echo ==========================================
echo   Step 3 -- Waiting for GitHub Actions
echo ==========================================
echo.
echo   Monitor the build at:
echo   https://github.com/%GITHUB_REPO%/actions
echo.
echo   Workflow: Build and Push Docker Images
echo.
echo   It will push:
echo     ahmedkhalaf666/next-flask-social-backend:%VERSION%
echo     ahmedkhalaf666/next-flask-social-frontend:%VERSION%
echo.


:waitloop
set CONFIRM=
set /p CONFIRM="Has GitHub Actions finished? [y / yes / Enter to deploy]: "
if /i "!CONFIRM!"=="y"   goto proceed
if /i "!CONFIRM!"=="yes" goto proceed
if    "!CONFIRM!"==""    goto proceed
echo [WARN] Waiting... Check the Actions tab and press Enter when done.
goto waitloop

:proceed
echo.


rem --- Apply All Mainfests --------
echo ============================================
echo Applying kubernetes mainfests
echo ============================================

echo [INFO] Applying namespace..
kubectl apply -f "%K8S_DIR%\namespace.yaml"

echo [INFO] Applying MongoDB..
kubectl apply -f "%K8S_DIR%\mongodb"

echo [INFO] Applying Redis..
kubectl apply -f "%K8S_DIR%\redis"

echo [INFO] Applying Backend..
kubectl apply -f "%K8S_DIR%\backend"

echo [INFO] Applying Frontend..
kubectl apply -f "%K8S_DIR%\frontend"


echo.
echo [Ok] All mainfests applied.

rem ----- Rollout Status ------------------
echo ============================================
echo Watching rollout progress
echo ============================================
echo.

echo backend rollout:
kubectl rollout status deployment/backend -n social-app --timeout=3m
if !ERRORLEVEL! NEQ 0 (
    echo [WARN] Backend rollout timeout
    echo        Check: kubectl get pods -n social-app
)


echo frontend rollout:
kubectl rollout status deployment/frontend -n social-app --timeout=3m
if !ERRORLEVEL! NEQ 0 (
    echo [WARN] frontend rollout timeout
    echo        Check: kubectl get pods -n social-app
)

rem ----- Summary ------------------
echo.
echo ==========================================
echo   Running!
echo ==========================================
echo.
echo   Access your app:
echo     Frontend  --  http://localhost
echo     Backend   --  http://localhost:5000
echo.
echo   Useful commands:
echo     kubectl get pods -n social-app
echo     kubectl get svc  -n social-app
echo     kubectl logs -f deployment/backend  -n social-app
echo     kubectl logs -f deployment/frontend -n social-app
echo.
echo   To stop everything run:  .\stop-k8s.bat
echo.

endlocal
pause