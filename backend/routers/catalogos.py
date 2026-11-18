from fastapi import APIRouter

try:
    from database import query_all
except ImportError:
    from backend.database import query_all

router = APIRouter(prefix="/api", tags=["Catalogos"])

@router.get("/materias")
def get_materias():
    return query_all("SELECT id_materia, clave_materia, nombre_materia FROM materia ORDER BY nombre_materia ASC")

@router.get("/docentes")
def get_docentes():
    return query_all("SELECT id_usuario, expediente, nombre, correo FROM usuario WHERE rol = 'docente' ORDER BY nombre ASC")

@router.get("/alumnos")
def get_alumnos():
    return query_all("SELECT id_usuario, expediente, nombre, correo FROM usuario WHERE rol = 'alumno' ORDER BY nombre ASC")

