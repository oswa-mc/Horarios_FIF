from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any, Optional
from datetime import datetime

try:
    from database import query_all, query_one, execute_write
    from schemas import EventoCreate, EventoStatusUpdate
    from auth import get_current_user
except ImportError:
    from backend.database import query_all, query_one, execute_write
    from backend.schemas import EventoCreate, EventoStatusUpdate
    from backend.auth import get_current_user

router = APIRouter(prefix="/api/eventos", tags=["Eventos Comunitarios"])

MYSQL_DAYOFWEEK_TO_DIA = {
    1: 'domingo',
    2: 'lunes',
    3: 'martes',
    4: 'miercoles',
    5: 'jueves',
    6: 'viernes',
    7: 'sabado'
}

def verificar_conflicto_evento(id_espacio: int, fecha_evento: str, hora_inicio: str, hora_fin: str, id_evento_actual: Optional[int] = None):
    if len(hora_inicio) == 5:
        hora_inicio += ":00"
    if len(hora_fin) == 5:
        hora_fin += ":00"

    sql_clases = """
        SELECT cp.id_clase, m.nombre_materia, cp.dia_semana, cp.hora_inicio, cp.hora_fin, e.nombre_espacio
        FROM clase_programada cp
        JOIN materia m ON cp.id_materia = m.id_materia
        JOIN espacio_academico e ON cp.id_espacio = e.id_espacio
        WHERE cp.id_espacio = %s
          AND cp.dia_semana = (
              CASE DAYOFWEEK(%s)
                  WHEN 1 THEN 'domingo'
                  WHEN 2 THEN 'lunes'
                  WHEN 3 THEN 'martes'
                  WHEN 4 THEN 'miercoles'
                  WHEN 5 THEN 'jueves'
                  WHEN 6 THEN 'viernes'
                  WHEN 7 THEN 'sabado'
              END
          )
          AND (cp.hora_inicio < %s AND cp.hora_fin > %s)
    """
    conflicto_clase = query_one(sql_clases, (id_espacio, fecha_evento, hora_fin, hora_inicio))
    if conflicto_clase:
        return {
            "hay_conflicto": True,
            "motivo": f"Choque con la clase '{conflicto_clase['nombre_materia']}' programada los {conflicto_clase['dia_semana']} de {conflicto_clase['hora_inicio']} a {conflicto_clase['hora_fin']} en {conflicto_clase['nombre_espacio']}."
        }

    sql_evento = """
        SELECT ec.id_evento, ec.titulo, ec.fecha_evento, ec.hora_inicio, ec.hora_fin, e.nombre_espacio
        FROM evento_comunitario ec
        JOIN espacio_academico e ON ec.id_espacio = e.id_espacio
        WHERE ec.id_espacio = %s
          AND ec.fecha_evento = %s
          AND ec.estado_evento = 'aprobado'
          AND (%s IS NULL OR ec.id_evento != %s)
          AND (ec.hora_inicio < %s AND ec.hora_fin > %s)
    """
    conflicto_evento = query_one(sql_evento, (id_espacio, fecha_evento, id_evento_actual, id_evento_actual, hora_fin, hora_inicio))
    if conflicto_evento:
        return {
            "hay_conflicto": True,
            "motivo": f"Choque con el evento aprobado '{conflicto_evento['titulo']}' de {conflicto_evento['hora_inicio']} a {conflicto_evento['hora_fin']} en {conflicto_evento['nombre_espacio']}."
        }

    return {"hay_conflicto": False, "motivo": None}

@router.get("")
def get_eventos(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("rol")
    user_id = current_user.get("id_usuario")

    sql = """
        SELECT 
            ec.id_evento,
            ec.titulo,
            ec.descripcion,
            ec.fecha_evento,
            SUBSTRING(ec.hora_inicio, 1, 5) as hora_inicio,
            SUBSTRING(ec.hora_fin, 1, 5) as hora_fin,
            ec.estado_evento,
            ec.id_proponente,
            up.nombre as nombre_proponente,
            up.expediente as expediente_proponente,
            up.rol as rol_proponente,
            ec.id_aprobador,
            ua.nombre as nombre_aprobador,
            ec.id_espacio,
            e.nombre_espacio,
            e.tipo as tipo_espacio,
            e.capacidad as capacidad_espacio,
            e.categoria as categoria_espacio
        FROM evento_comunitario ec
        JOIN espacio_academico e ON ec.id_espacio = e.id_espacio
        JOIN usuario up ON ec.id_proponente = up.id_usuario
        LEFT JOIN usuario ua ON ec.id_aprobador = ua.id_usuario
    """

    params = ()
    if user_role != "administrador":
        sql += " WHERE (ec.estado_evento = 'aprobado' OR ec.id_proponente = %s)"
        params = (user_id,)

    sql += " ORDER BY FIELD(ec.estado_evento, 'pendiente', 'aprobado', 'rechazado', 'cancelado'), ec.id_evento DESC"
    
    eventos = query_all(sql, params)

    for ev in eventos:
        if ev["estado_evento"] == "pendiente":
            evaluacion = verificar_conflicto_evento(
                ev["id_espacio"],
                str(ev["fecha_evento"]),
                ev["hora_inicio"],
                ev["hora_fin"],
                ev["id_evento"]
            )
            ev["empalme_detectado"] = evaluacion["hay_conflicto"]
            ev["aviso_conflicto"] = evaluacion["motivo"]
        else:
            ev["empalme_detectado"] = False
            ev["aviso_conflicto"] = None

    return eventos

@router.post("", status_code=status.HTTP_201_CREATED)
def crear_evento(payload: EventoCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id_usuario")

    inicio = payload.hora_inicio
    fin = payload.hora_fin
    if len(inicio) == 5:
        inicio += ":00"
    if len(fin) == 5:
        fin += ":00"

    if inicio >= fin:
        raise HTTPException(status_code=400, detail="La hora de inicio debe ser anterior a la hora de fin")

    h_ini, m_ini = map(int, inicio[:5].split(':'))
    h_fin, m_fin = map(int, fin[:5].split(':'))
    duracion_min = (h_fin * 60 + m_fin) - (h_ini * 60 + m_ini)
    if duracion_min < 30:
        raise HTTPException(status_code=400, detail="Los eventos deben tener minimo 30 minutos de duracion")

    espacio = query_one("SELECT id_espacio FROM espacio_academico WHERE id_espacio = %s", (payload.id_espacio,))
    if not espacio:
        raise HTTPException(status_code=404, detail="El espacio academico seleccionado no existe")

    sql = """
        INSERT INTO evento_comunitario (titulo, descripcion, fecha_evento, hora_inicio, hora_fin, estado_evento, id_proponente, id_espacio)
        VALUES (%s, %s, %s, %s, %s, 'pendiente', %s, %s)
    """
    new_id = execute_write(sql, (payload.titulo, payload.descripcion, payload.fecha_evento, inicio, fin, user_id, payload.id_espacio))

    return {
        "message": "Solicitud de evento registrada exitosamente",
        "id_evento": new_id,
        "titulo": payload.titulo,
        "estado_evento": "pendiente"
    }

# Soporte adicional para PATCH /api/eventos/admin/{id_evento}
@router.patch("/admin/{id_evento}")
def actualizar_estado_evento(id_evento: int, payload: EventoStatusUpdate, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "administrador":
        raise HTTPException(status_code=403, detail="Solo los administradores pueden gestionar solicitudes de eventos")

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

@router.patch("/{id_evento}/cancelar")
def cancelar_evento(id_evento: int, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id_usuario")
    user_role = current_user.get("rol")

    evento = query_one("SELECT * FROM evento_comunitario WHERE id_evento = %s", (id_evento,))
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    if evento["id_proponente"] != user_id and user_role != "administrador":
        raise HTTPException(
            status_code=403,
            detail="Solo la persona que propuso el evento o un administrador pueden cancelarlo"
        )

    if evento["estado_evento"] == "cancelado":
        return {
            "message": "El evento ya se encuentra cancelado",
            "id_evento": id_evento,
            "estado_evento": "cancelado"
        }

    execute_write("UPDATE evento_comunitario SET estado_evento = 'cancelado' WHERE id_evento = %s", (id_evento,))

    return {
        "message": "Evento cancelado exitosamente",
        "id_evento": id_evento,
        "estado_evento": "cancelado"
    }


