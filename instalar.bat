@echo off
title Instalador - Sistema de Horarios FIF-UAQ
color 0B

echo ======================================================================
echo    INSTALADOR DEL SISTEMA DE GESTION DE HORARIOS Y RECURSOS (FIF-UAQ)
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/4] Verificando instalacion de Python...
python --version >nul 2>&1
if errorlevel 1 goto :no_python
echo    [OK] Python detectado.

echo.
echo [2/4] Verificando instalacion de Node.js y npm...
node --version >nul 2>&1
if errorlevel 1 goto :no_node
npm --version >nul 2>&1
if errorlevel 1 goto :no_node
echo    [OK] Node.js y npm detectados.

echo.
echo [3/4] Instalando dependencias del Backend (Python FastAPI)...
cd /d "%~dp0backend"
if not exist "venv" (
    echo    Creando entorno virtual Python...
    python -m venv venv
)
echo    Instalando librerias de requirements.txt...
venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 goto :error_pip
echo    [OK] Dependencias de Python instaladas.

echo.
echo [4/4] Instalando dependencias del Frontend (React)...
cd /d "%~dp0frontend"
echo    Ejecutando npm install...
call npm install --no-audit --no-fund
if errorlevel 1 goto :error_npm
echo    [OK] Dependencias de React instaladas.

echo.
echo ======================================================================
echo Importando Base de Datos en MySQL (Puerto 3306)...
echo ======================================================================
cd /d "%~dp0"
set MYSQL_BIN=D:\xampp\mysql\bin\mysql.exe
if not exist "%MYSQL_BIN%" set MYSQL_BIN=C:\xampp\mysql\bin\mysql.exe
if not exist "%MYSQL_BIN%" set MYSQL_BIN=mysql

"%MYSQL_BIN%" -h 127.0.0.1 -P 3306 -u root -e "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo [AVISO] MySQL no respondio en 127.0.0.1:3306.
    echo Asegurate de que MySQL este iniciado en XAMPP y luego ejecuta "importar_bd.bat".
    goto :fin_ok
)

echo Importando backend\database\gestion_academica.sql...
"%MYSQL_BIN%" -h 127.0.0.1 -P 3306 -u root < "backend\database\gestion_academica.sql"
if errorlevel 1 (
    echo [AVISO] No se pudo importar automaticamente la base de datos.
    echo Puedes ejecutar "importar_bd.bat" o importarla desde:
    echo http://localhost:8080/phpmyadmin
) else (
    echo [OK] Base de datos gestion_academica importada con exito.
)

:fin_ok
echo.
echo ======================================================================
echo    INSTALACION COMPLETADA CON EXITO
echo ======================================================================
echo Para iniciar el sistema completo, ejecuta:
echo    iniciar_sistema.bat
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