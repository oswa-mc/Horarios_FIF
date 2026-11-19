@echo off
setlocal EnableExtensions
title Instalador y Verificador de Requerimientos - Horarios FIF-UAQ
color 0B

echo ======================================================================
echo    INSTALADOR DEL SISTEMA DE GESTION DE HORARIOS Y RECURSOS FIF-UAQ
echo ======================================================================
echo.

cd /d "%~dp0"

REM ------------------------------------------------------------------
REM SELECCION DEL METODO DE DESCARGA (curl o powershell)
REM ------------------------------------------------------------------
set "DOWNLOAD_CMD=none"
where.exe curl.exe >nul 2>&1
if not errorlevel 1 set "DOWNLOAD_CMD=curl"
if "%DOWNLOAD_CMD%"=="none" (
    where.exe powershell.exe >nul 2>&1
    if not errorlevel 1 set "DOWNLOAD_CMD=powershell"
)

REM ==================================================================
REM [1/5] VERIFICACION Y DESCARGA DE PYTHON
REM ==================================================================
echo [1/5] Verificando instalacion de Python...
call :buscar_python
if defined PYTHON_EXE goto :python_encontrado

echo    [AVISO] Python no se detecto en el equipo.
if "%DOWNLOAD_CMD%"=="none" (
    echo    [ERROR] No se cuenta con curl ni PowerShell para descargar automaticamente.
    echo    Por favor descarga Python manualmente desde: https://www.python.org/downloads/
    goto :no_python
)

echo    Iniciando descarga automatica del instalador oficial de Python 3.11...
set "PY_INSTALLER=%TEMP%\python_installer.exe"
set "PY_URL=https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
call :descargar_archivo "%PY_URL%" "%PY_INSTALLER%"
if errorlevel 1 (
    echo    [ERROR] Fallo la descarga del instalador de Python. Verifica tu conexion a internet.
    goto :no_python
)

echo    Descarga completa. Ejecutando instalador de Python...
start /wait "" "%PY_INSTALLER%" /passive InstallAllUsers=1 PrependPath=1 Include_pip=1
if errorlevel 1 (
    echo    [AVISO] Iniciando instalador visual de Python...
    start /wait "" "%PY_INSTALLER%"
)

call :buscar_python
if not defined PYTHON_EXE goto :no_python

:python_encontrado
for /f "tokens=*" %%v in ('"%PYTHON_EXE%" --version 2^>^&1') do echo    [OK] %%v detectado correctamente.

REM ==================================================================
REM [2/5] VERIFICACION Y DESCARGA DE NODE.JS Y NPM
REM ==================================================================
echo.
echo [2/5] Verificando instalacion de Node.js y npm...
call :buscar_node
if "%NODE_OK%"=="1" goto :node_encontrado

echo    [AVISO] Node.js no se detecto en el equipo.
if "%DOWNLOAD_CMD%"=="none" (
    echo    [ERROR] No se cuenta con curl ni PowerShell para descargar automaticamente.
    echo    Por favor descarga Node.js manualmente desde: https://nodejs.org/
    goto :no_node
)

echo    Iniciando descarga automatica del instalador oficial de Node.js LTS...
set "NODE_INSTALLER=%TEMP%\node_installer.msi"
set "NODE_URL=https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi"
call :descargar_archivo "%NODE_URL%" "%NODE_INSTALLER%"
if errorlevel 1 (
    echo    [ERROR] Fallo la descarga del instalador de Node.js. Verifica tu conexion a internet.
    goto :no_node
)

echo    Descarga completa. Ejecutando instalador de Node.js...
start /wait msiexec /i "%NODE_INSTALLER%" /passive
if errorlevel 1 (
    echo    [AVISO] Iniciando instalador interactivo de Node.js...
    start /wait msiexec /i "%NODE_INSTALLER%"
)

call :buscar_node
if not "%NODE_OK%"=="1" goto :no_node

:node_encontrado
for /f "tokens=*" %%v in ('node --version 2^>^&1') do echo    [OK] Node.js %%v detectado.
for /f "tokens=*" %%v in ('call npm --version 2^>^&1') do echo    [OK] npm v%%v detectado.

REM ==================================================================
REM [3/5] INSTALACION DE DEPENDENCIAS BACKEND (Python FastAPI)
REM ==================================================================
echo.
echo [3/5] Instalando dependencias del Backend (Python FastAPI)...
cd /d "%~dp0backend"
if exist "venv\Scripts\python.exe" (
    "venv\Scripts\python.exe" -c "import sys" >nul 2>&1
    if errorlevel 1 (
        echo    Entorno virtual previo no valido. Recreando backend\venv...
        rmdir /s /q "venv" >nul 2>&1
    )
)
if not exist "venv\Scripts\python.exe" (
    echo    Creando entorno virtual Python en backend\venv...
    "%PYTHON_EXE%" -m venv venv
    if errorlevel 1 goto :error_pip
)
echo    Instalando y verificando librerias de requirements.txt...
"venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
    "venv\Scripts\python.exe" -c "import fastapi, uvicorn, pydantic, jwt, pymysql, cryptography, passlib, bcrypt, multipart, dotenv" >nul 2>&1
    if errorlevel 1 goto :error_pip
    echo    [AVISO] No se pudo consultar internet para pip, pero las librerias ya estan instaladas.
)
echo    [OK] Dependencias de Python listas.

REM ==================================================================
REM [4/5] INSTALACION DE DEPENDENCIAS FRONTEND (React y Vite)
REM ==================================================================
echo.
echo [4/5] Instalando dependencias del Frontend (React y Vite)...
cd /d "%~dp0frontend"
echo    Ejecutando npm install...
call npm install --no-audit --no-fund
if errorlevel 1 (
    if exist "node_modules\vite\package.json" (
        echo    [AVISO] No se pudo consultar internet para npm, pero node_modules ya esta instalado.
    ) else (
        goto :error_npm
    )
)
echo    [OK] Dependencias de React listas.

REM ==================================================================
REM [5/5] VERIFICACION Y CARGA DE BASE DE DATOS MYSQL (Puerto 3306)
REM ==================================================================
echo.
echo [5/5] Verificando Base de Datos en MySQL (Puerto 3306)...
cd /d "%~dp0"

set "MYSQL_BIN="
if exist "D:\xampp\mysql\bin\mysql.exe" set "MYSQL_BIN=D:\xampp\mysql\bin\mysql.exe"
if not defined MYSQL_BIN if exist "C:\xampp\mysql\bin\mysql.exe" set "MYSQL_BIN=C:\xampp\mysql\bin\mysql.exe"
if not defined MYSQL_BIN call :buscar_mysql_rutas
if not defined MYSQL_BIN (
    where.exe mysql.exe >nul 2>&1
    if not errorlevel 1 set "MYSQL_BIN=mysql.exe"
)

if defined MYSQL_BIN goto :mysql_detectado

echo    [AVISO] No se detecto MySQL ni XAMPP en las rutas del sistema.
if "%DOWNLOAD_CMD%"=="none" (
    echo    [AVISO] Descarga XAMPP manualmente desde: https://www.apachefriends.org/es/index.html
    goto :mysql_detectado
)

echo    Iniciando descarga automatica del instalador de XAMPP para Windows...
set "XAMPP_INSTALLER=%TEMP%\xampp_installer.exe"
set "XAMPP_URL=https://downloads.sourceforge.net/project/xampp/XAMPP%%20Windows/8.2.12/xampp-windows-x64-8.2.12-0-VS16-installer.exe"
call :descargar_archivo "%XAMPP_URL%" "%XAMPP_INSTALLER%"
if errorlevel 1 (
    echo    [AVISO] No se pudo descargar XAMPP automaticamente.
    echo    Puedes descargarlo manualmente desde: https://www.apachefriends.org/es/index.html
) else (
    echo    Descarga completa de XAMPP.
    echo    Abriendo instalador de XAMPP para instalar Apache y MySQL...
    start /wait "" "%XAMPP_INSTALLER%"
)
if exist "C:\xampp\mysql\bin\mysql.exe" set "MYSQL_BIN=C:\xampp\mysql\bin\mysql.exe"
if not defined MYSQL_BIN if exist "D:\xampp\mysql\bin\mysql.exe" set "MYSQL_BIN=D:\xampp\mysql\bin\mysql.exe"

:mysql_detectado
set "DB_OK=0"
if not defined MYSQL_BIN (
    echo    [AVISO] No se encontro mysql.exe. Instala XAMPP e inicia el servicio MySQL.
    goto :revision_final
)

echo    [OK] Cliente MySQL detectado: %MYSQL_BIN%
"%MYSQL_BIN%" -h 127.0.0.1 -P 3306 -u root -e "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo    [AVISO] MySQL no respondio en el puerto 3306.
    echo    Asegurate de iniciar MySQL en XAMPP y luego ejecutar "importar_bd.bat".
    goto :revision_final
)

echo    Importando base de datos gestion_academica...
"%MYSQL_BIN%" -h 127.0.0.1 -P 3306 -u root < "backend\database\gestion_academica.sql"
if errorlevel 1 (
    echo    [AVISO] No se pudo importar automaticamente la base de datos.
    echo    Puedes ejecutar "importar_bd.bat" o importarla en: http://localhost:8080/phpmyadmin
) else (
    echo    [OK] Base de datos gestion_academica importada con exito.
    set "DB_OK=1"
)

:revision_final
echo.
echo ======================================================================
echo    REVISION DE REQUERIMIENTOS PARA EL PASO 2 (INICIAR SISTEMA)
echo ======================================================================
set "TODO_LISTO=1"

REM 1. Backend venv
if exist "%~dp0backend\venv\Scripts\python.exe" (
    echo  [OK] Backend: Entorno virtual y dependencias listas.
) else (
    echo  [FALLO] Backend: No se encontro el entorno virtual en backend\venv.
    set "TODO_LISTO=0"
)

REM 2. Frontend node_modules
if exist "%~dp0frontend\node_modules" (
    echo  [OK] Frontend: Librerias de React y Vite listas.
) else (
    echo  [FALLO] Frontend: No se encontro la carpeta frontend\node_modules.
    set "TODO_LISTO=0"
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

REM ==================================================================
REM SUBRUTINAS DE BUSQUEDA Y DESCARGA
REM ==================================================================

:buscar_python
set "PYTHON_EXE="
python -c "import sys" >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%p in ('python -c "import sys; print(sys.executable)" 2^>nul') do set "PYTHON_EXE=%%p"
)
if defined PYTHON_EXE exit /b 0

py -3 -c "import sys" >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%p in ('py -3 -c "import sys; print(sys.executable)" 2^>nul') do set "PYTHON_EXE=%%p"
)
if defined PYTHON_EXE exit /b 0

for /d %%d in ("%LOCALAPPDATA%\Programs\Python\Python*") do (
    if not defined PYTHON_EXE call :probar_ruta_python "%%d"
)
if defined PYTHON_EXE exit /b 0

for /d %%d in ("C:\Program Files\Python*") do (
    if not defined PYTHON_EXE call :probar_ruta_python "%%d"
)
if defined PYTHON_EXE exit /b 0

for /d %%d in ("C:\Python*") do (
    if not defined PYTHON_EXE call :probar_ruta_python "%%d"
)
if defined PYTHON_EXE exit /b 0

for /d %%d in ("D:\Python*") do (
    if not defined PYTHON_EXE call :probar_ruta_python "%%d"
)
if defined PYTHON_EXE exit /b 0

for /d %%d in ("D:\Program Files\Python*") do (
    if not defined PYTHON_EXE call :probar_ruta_python "%%d"
)
if defined PYTHON_EXE exit /b 0
exit /b 1

:probar_ruta_python
if not exist "%~1\python.exe" exit /b 1
"%~1\python.exe" -c "import sys" >nul 2>&1
if errorlevel 1 exit /b 1
set "PATH=%~1;%~1\Scripts;%PATH%"
set "PYTHON_EXE=%~1\python.exe"
exit /b 0

:buscar_node
set "NODE_OK=0"
node --version >nul 2>&1
if errorlevel 1 goto :buscar_node_rutas
call npm --version >nul 2>&1
if errorlevel 1 goto :buscar_node_rutas
set "NODE_OK=1"
exit /b 0

:buscar_node_rutas
call :probar_ruta_node "C:\Program Files\nodejs"
if "%NODE_OK%"=="1" exit /b 0
call :probar_ruta_node "C:\Program Files (x86)\nodejs"
if "%NODE_OK%"=="1" exit /b 0
call :probar_ruta_node "D:\Nodejs"
if "%NODE_OK%"=="1" exit /b 0
call :probar_ruta_node "C:\Nodejs"
if "%NODE_OK%"=="1" exit /b 0
call :probar_ruta_node "D:\Program Files\nodejs"
if "%NODE_OK%"=="1" exit /b 0
call :probar_ruta_node "%LOCALAPPDATA%\Programs\nodejs"
if "%NODE_OK%"=="1" exit /b 0
exit /b 1

:probar_ruta_node
if not exist "%~1\node.exe" exit /b 1
set "PATH=%~1;%APPDATA%\npm;%PATH%"
node --version >nul 2>&1
if errorlevel 1 exit /b 1
call npm --version >nul 2>&1
if errorlevel 1 exit /b 1
set "NODE_OK=1"
exit /b 0

:buscar_mysql_rutas
for /d %%d in ("C:\Program Files\MySQL\MySQL Server *") do (
    if not defined MYSQL_BIN if exist "%%d\bin\mysql.exe" set "MYSQL_BIN=%%d\bin\mysql.exe"
)
for /d %%d in ("D:\Program Files\MySQL\MySQL Server *") do (
    if not defined MYSQL_BIN if exist "%%d\bin\mysql.exe" set "MYSQL_BIN=%%d\bin\mysql.exe"
)
exit /b 0

:descargar_archivo
set "DL_URL=%~1"
set "DL_DEST=%~2"
if exist "%DL_DEST%" del /f /q "%DL_DEST%" >nul 2>&1

if "%DOWNLOAD_CMD%"=="curl" goto :dl_curl
if "%DOWNLOAD_CMD%"=="powershell" goto :dl_ps
exit /b 1

:dl_curl
curl.exe -f -L --progress-bar -o "%DL_DEST%" "%DL_URL%"
if not errorlevel 1 if exist "%DL_DEST%" exit /b 0
echo    [AVISO] curl no pudo completar la descarga. Reintentando con PowerShell...
where.exe powershell.exe >nul 2>&1
if errorlevel 1 exit /b 1

:dl_ps
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%DL_URL%' -OutFile '%DL_DEST%' -UseBasicParsing"
if not errorlevel 1 if exist "%DL_DEST%" exit /b 0
exit /b 1

REM ==================================================================
REM MANEJO DE ERRORES
REM ==================================================================

:no_python
echo.
echo [ERROR] No fue posible verificar o instalar Python en el equipo.
echo Instala Python 3.10 o superior marcando la casilla "Add python.exe to PATH".
echo Descarga: https://www.python.org/downloads/
echo.
pause
exit /b 1

:no_node
echo.
echo [ERROR] No fue posible verificar o instalar Node.js y npm en el equipo.
echo Descarga e instala Node.js LTS desde: https://nodejs.org/
echo.
pause
exit /b 1

:error_pip
echo.
echo [ERROR] Hubo un error al instalar las dependencias de Python con pip.
echo Verifica tu conexion a internet o ejecuta: backend\venv\Scripts\pip install -r backend\requirements.txt
echo.
pause
exit /b 1

:error_npm
echo.
echo [ERROR] Hubo un error al ejecutar npm install en frontend.
echo Verifica tu conexion a internet o ejecuta: cd frontend ^&^& npm install
echo.
pause
exit /b 1
