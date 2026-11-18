from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any

try:
    from database import query_all, query_one
    from auth import get_current_user
except ImportError:
    from backend.database import query_all, query_one
    from backend.auth import get_current_user

router = APIRouter(prefix="/api/alumno", tags=["Alumno"])

@router.get("/{id_usuario}/horario")
def get_horario_alumno(id_usuario: int, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "administrador" and current_user.get("id_usuario") != id_usuario:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver el horario de otro alumno")

    sql = """
        SELECT 
            cp.id_clase,
            cp.dia_semana,
            SUBSTRING(cp.hora_inicio, 1, 5) as hora_inicio,
            SUBSTRING(cp.hora_fin, 1, 5) as hora_fin,
            cp.periodo_lectivo,
            m.id_materia,
            m.clave_materia,
            m.nombre_materia,
            e.id_espacio,
            e.nombre_espacio,
            e.tipo as tipo_espacio,
            u.id_usuario as id_docente,
            u.nombre as nombre_docente,
            COALESCE(rec.estado, 'normal') as estado,
            rec.enlace_virtual,
            rec.observaciones,
            rec.fecha as fecha_estado
        FROM carga_academica_alumno ca
        JOIN clase_programada cp ON ca.id_clase = cp.id_clase
        JOIN materia m ON cp.id_materia = m.id_materia
        JOIN espacio_academico e ON cp.id_espacio = e.id_espacio
        JOIN usuario u ON cp.id_docente = u.id_usuario
        LEFT JOIN (
            SELECT r1.*
            FROM registro_estado_clase r1
            INNER JOIN (
                SELECT id_clase, MAX(id_estado_clase) as max_id
                FROM registro_estado_clase
                GROUP BY id_clase
            ) r2 ON r1.id_clase = r2.id_clase AND r1.id_estado_clase = r2.max_id
        ) rec ON cp.id_clase = rec.id_clase
        WHERE ca.id_alumno = %s
        ORDER BY 
            FIELD(cp.dia_semana, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'),
            cp.hora_inicio ASC
    """
    
    clases = query_all(sql, (id_usuario,))
    return clases

