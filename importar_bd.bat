
@echo off
title Importador de Base de Datos FIF-UAQ
color 0A

echo ======================================================================
echo       IMPORTADOR DE BASE DE DATOS: GESTION_ACADEMICA (FIF-UAQ)
echo ======================================================================
echo.

cd /d "%~dp0"

set MYSQL_BIN=D:\xampp\mysql\bin\mysql.exe
if not exist "%MYSQL_BIN%" set MYSQL_BIN=C:\xampp\mysql\bin\mysql.exe
if not exist "%MYSQL_BIN%" set MYSQL_BIN=mysql

echo Conectando con MySQL en 127.0.0.1:3306...
"%MYSQL_BIN%" -h 127.0.0.1 -P 3306 -u root -e "SELECT 1;" >nul 2>&1
if errorlevel 1 goto :no_mysql

echo.
echo Importando backend\database\gestion_academica.sql ...
"%MYSQL_BIN%" -h 127.0.0.1 -P 3306 -u root < "backend\database\gestion_academica.sql"
if errorlevel 1 goto :error_import

echo.
echo ======================================================================
echo    BASE DE DATOS IMPORTADA EXITOSAMENTE
echo ======================================================================
echo Se ha creado la base de datos "gestion_academica" con las 7 tablas
echo y todos los datos semilla de prueba.
echo.
pause
exit /b 0

:no_mysql
echo.
echo [ERROR] No se pudo conectar a MySQL en el puerto 3306.
echo Por favor asegurate de que MySQL este iniciado en XAMPP.
echo.
pause
exit /b 1

:error_import
echo.
echo [ERROR] Fallo la importacion del script SQL.
echo Puedes importarlo manualmente en phpMyAdmin:
echo http://localhost:8080/phpmyadmin
echo.
pause
exit /b 1