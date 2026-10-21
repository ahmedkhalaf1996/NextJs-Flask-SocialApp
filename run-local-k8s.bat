@echo off 
setlocal EnableDelayedExpansion

rem ==================================================
rem run-local-k8s.bat start the socail app on docker desktop kuernetes 
rem ==================================================

set "REPO_ROOT=%~dp0"
set "K8S_DIR=%REPO_ROOT%k8s"

rem ==================================================
rem Social App -- start on k8s
rem ==================================================

rem --- preflight --------


where kubectl >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] kubectl is not installed or not in PATH
    pause
    exit /b 1
)


echo [OK] kubectl found.
echo.

rem --- show wich image verstions will be used --------
echo [INFO] Image verstions from k8s mainfests:

for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Select-String -Path '%K8S_DIR%\backend\deployment.yaml' -Pattern 'image:' | ForEach-Object { $_.Line.Trim() }"') do echo %%i
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Select-String -Path '%K8S_DIR%\frontend\deployment.yaml' -Pattern 'image:' | ForEach-Object { $_.Line.Trim() }"') do echo %%i

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