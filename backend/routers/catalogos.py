from fastapi import APIRouter, Query
from typing import Optional

try:
    from database import query_all
except ImportError:
    from backend.database import query_all

router = APIRouter(prefix="/api", tags=["Catalogos"])

@router.get("/materias")
def get_materias(carrera: Optional[str] = Query(None), semestre: Optional[int] = Query(None)):
    sql = "SELECT id_materia, clave_materia, nombre_materia, carrera, semestre, horas_teoria, horas_practica FROM materia WHERE 1=1"
    params = []
    if carrera:
        sql += " AND carrera = %s"
        params.append(carrera)
    if semestre:
        sql += " AND semestre = %s"
        params.append(semestre)
    sql += " ORDER BY carrera ASC, semestre ASC, clave_materia ASC"
    return query_all(sql, tuple(params))

@router.get("/carreras")
def get_carreras():
    carreras = query_all("SELECT DISTINCT carrera FROM materia ORDER BY carrera ASC")
    return [c["carrera"] for c in carreras]

@router.get("/docentes")
def get_docentes():
    return query_all("SELECT id_usuario, expediente, nombre, correo FROM usuario WHERE rol = 'docente' ORDER BY nombre ASC")

@router.get("/alumnos")
def get_alumnos():
    return query_all("SELECT id_usuario, expediente, nombre, correo FROM usuario WHERE rol = 'alumno' ORDER BY nombre ASC")
