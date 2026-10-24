@echo off 
setlocal EnableDelayedExpansion

rem ==================================================
rem stop-k9s.bat -- fully stop and clean up the social app from k8s
rem ==================================================

rem ==================================================
rem Social App -- Stop and clean k8s
rem ==================================================

rem --- preflight --------

set /p CONFIRM="Area you sure ? Type Yes to Continue: "
if /i "!CONFIRM!" NEQ "YES" (
    echo [INOF] Cancelled. Nohing was deletted.
    pause
    exit /b 0
)

echo.
echo [INFO] Delteing all resources in social-app namespace...

kubectl delete namespace social-app --wait=true

if !ERRORLEVEL! NEQ 0 (
    echo.
    echo [ok] NameSpace social-app and all its resources deleted
) else (
    echo.
    echo [WARN] NameSpace social-app may not have exists 

)

rem Force delete any stuck persisitantvolumes left behind
echo. 
echo [INFO] Cleaning up any leftover PersisistentVolumes...
kubectl delete pvc mongodb-pvc --ignore-not-found=true
kubectl delete pv --selector=app=mongodb --ignore-not-found=true 2>nul

echo.
echo ==========================================
echo   Cleanup Complete
echo ==========================================
echo.
echo   All pods, services, volumes and the namespace are gone.
echo   To redeploy run:  .\run-local-k8s.bat   (local build)
echo              or:    .\deploy.bat            (versioned release via GitHub)
echo.

endlocal
pause
