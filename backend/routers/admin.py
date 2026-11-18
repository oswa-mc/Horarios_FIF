from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any

try:
    from database import query_all, query_one, execute_write
    from schemas import ClaseCreate, EventoStatusUpdate
    from auth import require_role, get_current_user
    from routers.eventos import verificar_conflicto_evento
except ImportError:
    from backend.database import query_all, query_one, execute_write
    from backend.schemas import ClaseCreate, EventoStatusUpdate
    from backend.auth import require_role, get_current_user
    from backend.routers.eventos import verificar_conflicto_evento

router = APIRouter(prefix="/api/admin", tags=["Administracion"], dependencies=[Depends(require_role(["administrador"]))])

DIA_TO_MYSQL_DAYOFWEEK = {
    'domingo': 1,
    'lunes': 2,
    'martes': 3,
    'miercoles': 4,
    'jueves': 5,
    'viernes': 6,
    'sabado': 7
}

@router.get("/clases")
def get_all_clases():
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
            u.id_usuario as id_docente,
            u.nombre as nombre_docente,
            u.expediente as expediente_docente,
            e.id_espacio,
            e.nombre_espacio,
            e.tipo as tipo_espacio,
            e.capacidad as capacidad_espacio,
            COUNT(DISTINCT ca.id_alumno) as total_alumnos
        FROM clase_programada cp
        JOIN materia m ON cp.id_materia = m.id_materia
        JOIN usuario u ON cp.id_docente = u.id_usuario
        JOIN espacio_academico e ON cp.id_espacio = e.id_espacio
        LEFT JOIN carga_academica_alumno ca ON cp.id_clase = ca.id_clase
        GROUP BY cp.id_clase, cp.dia_semana, cp.hora_inicio, cp.hora_fin, cp.periodo_lectivo,
                 m.id_materia, m.clave_materia, m.nombre_materia, u.id_usuario, u.nombre,
                 u.expediente, e.id_espacio, e.nombre_espacio, e.tipo, e.capacidad
        ORDER BY 
            FIELD(cp.dia_semana, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'),
            cp.hora_inicio ASC
    """
    return query_all(sql)

@router.post("/clases", status_code=status.HTTP_201_CREATED)
def crear_clase(clase: ClaseCreate):
    nueva_inicio = clase.hora_inicio
    nueva_fin = clase.hora_fin

    if len(nueva_inicio) == 5:
        nueva_inicio += ":00"
    if len(nueva_fin) == 5:
        nueva_fin += ":00"

    if nueva_inicio >= nueva_fin:
        raise HTTPException(
            status_code=400,
            detail="La hora de inicio debe ser anterior a la hora de fin"
        )

    # 1. Empalme de Espacio
    sql_espacio = """
        SELECT cp.id_clase, m.nombre_materia, cp.hora_inicio, cp.hora_fin, e.nombre_espacio
        FROM clase_programada cp
        JOIN materia m ON cp.id_materia = m.id_materia
        JOIN espacio_academico e ON cp.id_espacio = e.id_espacio
        WHERE cp.id_espacio = %s
          AND cp.dia_semana = %s
          AND cp.periodo_lectivo = %s
          AND (cp.hora_inicio < %s AND cp.hora_fin > %s)
    """
    empalme_espacio = query_one(
        sql_espacio,
        (clase.id_espacio, clase.dia_semana, clase.periodo_lectivo, nueva_fin, nueva_inicio)
    )
    if empalme_espacio:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Empalme detectado: el espacio '{empalme_espacio['nombre_espacio']}' ya esta ocupado por la clase '{empalme_espacio['nombre_materia']}' ({empalme_espacio['hora_inicio']} - {empalme_espacio['hora_fin']}) los dias {clase.dia_semana}."
        )

    # 2. Empalme de Docente
    sql_docente = """
        SELECT cp.id_clase, m.nombre_materia, cp.hora_inicio, cp.hora_fin, u.nombre as nombre_docente
        FROM clase_programada cp
        JOIN materia m ON cp.id_materia = m.id_materia
        JOIN usuario u ON cp.id_docente = u.id_usuario
        WHERE cp.id_docente = %s
          AND cp.dia_semana = %s
          AND cp.periodo_lectivo = %s
          AND (cp.hora_inicio < %s AND cp.hora_fin > %s)
    """
    empalme_docente = query_one(
        sql_docente,
        (clase.id_docente, clase.dia_semana, clase.periodo_lectivo, nueva_fin, nueva_inicio)
    )
    if empalme_docente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Empalme detectado: el docente '{empalme_docente['nombre_docente']}' ya tiene asignada la clase '{empalme_docente['nombre_materia']}' ({empalme_docente['hora_inicio']} - {empalme_docente['hora_fin']}) los dias {clase.dia_semana}."
        )

    # 3. Colision con Evento Comunitario Aprobado
    dow = DIA_TO_MYSQL_DAYOFWEEK.get(clase.dia_semana)
    if dow:
        sql_evento = """
            SELECT ec.id_evento, ec.titulo, ec.fecha_evento, ec.hora_inicio, ec.hora_fin, e.nombre_espacio
            FROM evento_comunitario ec
            JOIN espacio_academico e ON ec.id_espacio = e.id_espacio
            WHERE ec.estado_evento = 'aprobado'
              AND ec.id_espacio = %s
              AND DAYOFWEEK(ec.fecha_evento) = %s
              AND (ec.hora_inicio < %s AND ec.hora_fin > %s)
        """
        colision_evento = query_one(
            sql_evento,
            (clase.id_espacio, dow, nueva_fin, nueva_inicio)
        )
        if colision_evento:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Empalme detectado: el espacio '{colision_evento['nombre_espacio']}' tiene asignado el evento comunitario aprobado '{colision_evento['titulo']}' para la fecha {colision_evento['fecha_evento']} ({colision_evento['hora_inicio']} - {colision_evento['hora_fin']})."
            )

    insert_sql = """
        INSERT INTO clase_programada (id_materia, id_docente, id_espacio, dia_semana, hora_inicio, hora_fin, periodo_lectivo)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    new_id = execute_write(
        insert_sql,
        (clase.id_materia, clase.id_docente, clase.id_espacio, clase.dia_semana, nueva_inicio, nueva_fin, clase.periodo_lectivo)
    )

    return {
        "message": "Clase programada creada exitosamente",
        "id_clase": new_id,
        "id_materia": clase.id_materia,
        "id_docente": clase.id_docente,
        "id_espacio": clase.id_espacio,
        "dia_semana": clase.dia_semana,
        "hora_inicio": nueva_inicio,
        "hora_fin": nueva_fin,
        "periodo_lectivo": clase.periodo_lectivo
    }

@router.delete("/clases/{id_clase}")
def eliminar_clase(id_clase: int):
    clase = query_one("SELECT id_clase FROM clase_programada WHERE id_clase = %s", (id_clase,))
    if not clase:
        raise HTTPException(status_code=404, detail="La clase no existe")
    
    execute_write("DELETE FROM clase_programada WHERE id_clase = %s", (id_clase,))
    return {"message": "Clase eliminada correctamente", "id_clase": id_clase}

# Endpoint exacto segun especificacion: PATCH /api/admin/eventos/{id_evento}
@router.patch("/eventos/{id_evento}")
def patch_evento_admin(id_evento: int, payload: EventoStatusUpdate, current_user: dict = Depends(get_current_user)):
    evento = query_one("SELECT * FROM evento_comunitario WHERE id_evento = %s", (id_evento,))
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    nuevo_estado = payload.estado_evento.strip().lower()

    if nuevo_estado == "aprobado":
        conflicto = verificar_conflicto_evento(
            evento["id_espacio"],
            str(evento["fecha_evento"]),
            str(evento["hora_inicio"]),
            str(evento["hora_fin"]),
            id_evento_actual=id_evento
        )
        if conflicto["hay_conflicto"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"No se puede aprobar: empalme detectado en el espacio academico. {conflicto['motivo']}"
            )

        sql_update = """
            UPDATE evento_comunitario 
            SET estado_evento = 'aprobado', id_aprobador = %s 
            WHERE id_evento = %s
        """
        execute_write(sql_update, (current_user["id_usuario"], id_evento))
    else:
        sql_update = """
            UPDATE evento_comunitario 
            SET estado_evento = %s 
            WHERE id_evento = %s
        """
        execute_write(sql_update, (nuevo_estado, id_evento))

    return {
        "message": f"Evento actualizado a '{nuevo_estado}' exitosamente",
        "id_evento": id_evento,
        "estado_evento": nuevo_estado
    }

