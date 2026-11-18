import os
import pymysql
import pymysql.cursors
from contextlib import contextmanager
from fastapi import HTTPException

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "gestion_academica")

def get_connection():
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True
        )
        return connection
    except pymysql.MySQLError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Error de conexion con la base de datos MySQL (XAMPP): {str(e)}. Verifique que MySQL este iniciado."
        )

@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()

def query_all(sql: str, params: tuple = None):
    with get_db() as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql, params or ())
            return cursor.fetchall()

def query_one(sql: str, params: tuple = None):
    with get_db() as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql, params or ())
            return cursor.fetchone()

def execute_write(sql: str, params: tuple = None):
    with get_db() as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql, params or ())
            return cursor.lastrowid

