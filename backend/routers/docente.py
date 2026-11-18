from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any

try:
    from database import query_all, query_one, execute_write
    from schemas import EstadoClaseUpdate
    from auth import get_current_user
except ImportError:
    from backend.database import query_all, query_one, execute_write
    from backend.schemas import EstadoClaseUpdate
    from backend.auth import get_current_user

router = APIRouter(prefix="/api/docente", tags=["Docente"])

@router.get("/{id_usuario}/clases")
def get_clases_docente(id_usuario: int, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "administrador" and current_user.get("id_usuario") != id_usuario:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver las clases de este docente")

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
            COUNT(DISTINCT ca.id_alumno) as total_alumnos,
            COALESCE(rec.estado, 'normal') as estado,
            COALESCE(
                rec.enlace_virtual,
                (SELECT r_sub.enlace_virtual FROM registro_estado_clase r_sub 
                 WHERE r_sub.id_clase = cp.id_clase AND r_sub.enlace_virtual IS NOT NULL AND r_sub.enlace_virtual != '' 
                 ORDER BY r_sub.id_estado_clase DESC LIMIT 1)
            ) as enlace_virtual,
            rec.observaciones,
            rec.fecha as fecha_estado
        FROM clase_programada cp
        JOIN materia m ON cp.id_materia = m.id_materia
        JOIN espacio_academico e ON cp.id_espacio = e.id_espacio
        LEFT JOIN carga_academica_alumno ca ON cp.id_clase = ca.id_clase
        LEFT JOIN (
            SELECT r1.*
            FROM registro_estado_clase r1
            INNER JOIN (
                SELECT id_clase, MAX(id_estado_clase) as max_id
                FROM registro_estado_clase
                GROUP BY id_clase
            ) r2 ON r1.id_clase = r2.id_clase AND r1.id_estado_clase = r2.max_id
        ) rec ON cp.id_clase = rec.id_clase
        WHERE cp.id_docente = %s
        GROUP BY cp.id_clase, cp.dia_semana, cp.hora_inicio, cp.hora_fin, cp.periodo_lectivo,
                 m.id_materia, m.clave_materia, m.nombre_materia, e.id_espacio, e.nombre_espacio,
                 e.tipo, rec.estado, rec.enlace_virtual, rec.observaciones, rec.fecha
        ORDER BY 
            FIELD(cp.dia_semana, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'),
            cp.hora_inicio ASC
    """
    
    clases = query_all(sql, (id_usuario,))
    return clases

@router.post("/clases/{id_clase}/estado")
def actualizar_estado_clase(id_clase: int, payload: EstadoClaseUpdate, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("rol")
    user_id = current_user.get("id_usuario")

    clase = query_one("SELECT id_clase, id_docente FROM clase_programada WHERE id_clase = %s", (id_clase,))
    if not clase:
        raise HTTPException(status_code=404, detail="La clase especificada no existe")

    if user_role != "administrador":
        if user_role != "docente":
            raise HTTPException(status_code=403, detail="Solo los docentes pueden actualizar el estado de una clase")
        if clase["id_docente"] != user_id:
            raise HTTPException(status_code=403, detail="No estas autorizado para modificar el estado de esta clase (no eres el docente asignado)")

    if payload.estado == "virtual":
        if not payload.enlace_virtual or not (payload.enlace_virtual.startswith("http://") or payload.enlace_virtual.startswith("https://")):
            raise HTTPException(status_code=400, detail="Debe proporcionar un enlace web valido (iniciado con http:// o https://) para sesiones virtuales")

    enlace_a_guardar = payload.enlace_virtual.strip() if payload.enlace_virtual else None
    if not enlace_a_guardar and payload.estado != "cancelada":
        prev = query_one(
            "SELECT enlace_virtual FROM registro_estado_clase WHERE id_clase = %s AND enlace_virtual IS NOT NULL AND enlace_virtual != '' ORDER BY id_estado_clase DESC LIMIT 1",
            (id_clase,)
        )
        if prev and prev.get("enlace_virtual"):
            enlace_a_guardar = prev["enlace_virtual"]

    insert_sql = """
        INSERT INTO registro_estado_clase (id_clase, fecha, estado, enlace_virtual, observaciones)
        VALUES (%s, %s, %s, %s, %s)
    """
    new_id = execute_write(
        insert_sql,
        (id_clase, payload.fecha, payload.estado, enlace_a_guardar, payload.observaciones)
    )

    return {
        "message": "Estado de clase actualizado correctamente",
        "id_estado_clase": new_id,
        "id_clase": id_clase,
        "estado": payload.estado,
        "enlace_virtual": enlace_a_guardar,
        "observaciones": payload.observaciones,
        "fecha": payload.fecha
    }

