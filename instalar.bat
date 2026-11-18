@echo off
title Instalador y Verificador de Requerimientos - Horarios FIF-UAQ
color 0B

echo ======================================================================
echo    INSTALADOR DEL SISTEMA DE GESTION DE HORARIOS Y RECURSOS FIF-UAQ
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/5] Verificando instalacion de Python...
python --version >nul 2>&1
if errorlevel 1 goto :no_python
for /f "tokens=*" %%v in ('python --version') do echo    [OK] %%v detectado.

echo.
echo [2/5] Verificando instalacion de Node.js y npm...
node --version >nul 2>&1
if errorlevel 1 goto :no_node
npm --version >nul 2>&1
if errorlevel 1 goto :no_node
for /f "tokens=*" %%v in ('node --version') do echo    [OK] Node.js %%v detectado.
for /f "tokens=*" %%v in ('npm --version') do echo    [OK] npm v%%v detectado.

echo.
echo [3/5] Instalando dependencias del Backend (Python FastAPI)...
cd /d "%~dp0backend"
if not exist "venv" (
    echo    Creando entorno virtual Python...
    python -m venv venv
)
echo    Instalando librerias de requirements.txt...
venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 goto :error_pip
echo    [OK] Dependencias de Python instaladas con exito.

echo.
echo [4/5] Instalando dependencias del Frontend (React y Vite)...
cd /d "%~dp0frontend"
echo    Ejecutando npm install...
call npm install --no-audit --no-fund
if errorlevel 1 goto :error_npm
echo    [OK] Dependencias de React instaladas con exito.

echo.
echo [5/5] Verificando Base de Datos en MySQL (Puerto 3306)...
cd /d "%~dp0"
set MYSQL_BIN=D:\xampp\mysql\bin\mysql.exe
if not exist "%MYSQL_BIN%" set MYSQL_BIN=C:\xampp\mysql\bin\mysql.exe
if not exist "%MYSQL_BIN%" set MYSQL_BIN=mysql

set DB_OK=0
"%MYSQL_BIN%" -h 127.0.0.1 -P 3306 -u root -e "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo    [AVISO] MySQL no respondio en el puerto 3306.
    echo    Asegurate de iniciar MySQL en XAMPP y ejecutar "importar_bd.bat".
) else (
    echo    Importando base de datos gestion_academica...
    "%MYSQL_BIN%" -h 127.0.0.1 -P 3306 -u root < "backend\database\gestion_academica.sql"
    if errorlevel 1 (
        echo    [AVISO] No se pudo importar automaticamente la base de datos.
        echo    Puedes ejecutar "importar_bd.bat" o importarla en: http://localhost:8080/phpmyadmin
    ) else (
        echo    [OK] Base de datos gestion_academica importada con exito.
        set DB_OK=1
    )
)

echo.
echo ======================================================================
echo    REVISION DE REQUERIMIENTOS PARA EL PASO 2 (INICIAR SISTEMA)
echo ======================================================================
set TODO_LISTO=1

REM 1. Backend venv
if exist "%~dp0backend\venv\Scripts\python.exe" (
    echo  [OK] Backend: Entorno virtual y dependencias listas.
) else (
    echo  [FALLO] Backend: No se encontro el entorno virtual en backend\venv.
    set TODO_LISTO=0
)

REM 2. Frontend node_modules
if exist "%~dp0frontend\node_modules" (
    echo  [OK] Frontend: Librerias de React y Vite listas.
) else (
    echo  [FALLO] Frontend: No se encontro la carpeta frontend\node_modules.
    set TODO_LISTO=0
)

REM 3. MySQL
if "%DB_OK%"=="1" (
    echo  [OK] Base de datos: MySQL activo y gestion_academica cargada.
) else (
    echo  [AVISO] Base de datos: Recuerda presionar Start en MySQL de XAMPP.
)

echo.
echo ======================================================================
if "%TODO_LISTO%"=="1" (
    echo    INSTALACION COMPLETADA: TODO LISTO PARA EJECUTAR EL PASO 2
    echo ======================================================================
    echo Para arrancar el sistema completo haz doble clic en:
    echo    iniciar_sistema.bat
) else (
    echo    ATENCION: Revisa los requerimientos faltantes antes de continuar.
    echo ======================================================================
)
echo.
pause
exit /b 0

:no_python
echo [ERROR] Python no esta instalado o no se encuentra en el PATH.
echo Instala Python 3.10 o superior marcando "Add python.exe to PATH".
echo.
pause
exit /b 1

:no_node
echo [ERROR] Node.js o npm no estan instalados o no estan en el PATH.
echo Descarga e instala Node.js desde https://nodejs.org/
echo.
pause
exit /b 1

:error_pip
echo [ERROR] Hubo un error al instalar las dependencias de Python con pip.
echo.
pause
exit /b 1

:error_npm
echo [ERROR] Hubo un error al ejecutar npm install en frontend.
echo.
pause
exit /b 1