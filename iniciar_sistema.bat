@echo off
title Iniciador del Sistema - Horarios FIF-UAQ
color 0E

echo ======================================================================
echo       INICIANDO SISTEMA DE HORARIOS Y RECURSOS ACADEMICOS FIF-UAQ
echo ======================================================================
echo.

cd /d "%~dp0"

REM Auto-verificacion: Si no se han instalado dependencias del frontend, instalarlas
if not exist "%~dp0frontend\node_modules" (
    echo [AVISO] No se detecto la carpeta node_modules en frontend.
    echo Instalando paquetes necesarios de React y Vite...
    cd /d "%~dp0frontend"
    call npm install --no-audit --no-fund
    cd /d "%~dp0"
    echo.
)

REM Auto-verificacion: Si no se ha creado venv en backend, crearlo
if not exist "%~dp0backend\venv" (
    echo [AVISO] Creando entorno virtual de Python en backend...
    cd /d "%~dp0backend"
    python -m venv venv
    venv\Scripts\python.exe -m pip install -r requirements.txt
    cd /d "%~dp0"
    echo.
)

echo [1/3] Iniciando servidor Backend FastAPI en puerto 8000...
start "Backend FastAPI (FIF-UAQ)" cmd /k "cd /d %~dp0backend && venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

echo [2/3] Iniciando servidor Frontend React en puerto 5173...
start "Frontend React (FIF-UAQ)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [3/3] Abriendo aplicacion en el navegador...
ping -n 4 127.0.0.1 >nul
start http://localhost:5173

echo.
echo ======================================================================
echo    EL SISTEMA SE HA INICIADO CORRECTAMENTE
echo ======================================================================
echo.
echo  - Frontend:    http://localhost:5173
echo  - Backend API: http://localhost:8000
echo  - Swagger UI:  http://localhost:8000/docs
echo.
echo Cuentas de prueba - Contrasena: prueba123
echo  - Alumno:  2024001
echo  - Docente: DOC001
echo  - Admin:   ADM001
echo.
echo ======================================================================
pause