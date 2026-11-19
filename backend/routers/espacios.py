from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional

try:
    from database import query_all, query_one
    from auth import get_current_user
except ImportError:
    from backend.database import query_all, query_one
    from backend.auth import get_current_user

router = APIRouter(prefix="/api/espacios", tags=["Espacios Academicos"])

@router.get("")
def get_espacios(categoria: Optional[str] = Query(None)):
    sql = """
        SELECT 
            e.id_espacio,
            e.nombre_espacio,
            e.tipo,
            e.capacidad,
            e.categoria,
            COUNT(DISTINCT cp.id_clase) as total_clases_asignadas,
            COALESCE(SUM(TIME_TO_SEC(TIMEDIFF(cp.hora_fin, cp.hora_inicio)) / 3600), 0) as horas_ocupadas
        FROM espacio_academico e
        LEFT JOIN clase_programada cp ON e.id_espacio = cp.id_espacio
    """
    params = []
    if categoria:
        sql += " WHERE e.categoria LIKE %s"
        params.append(f"%{categoria}%")

    sql += """
        GROUP BY e.id_espacio, e.nombre_espacio, e.tipo, e.capacidad, e.categoria
        ORDER BY e.id_espacio ASC
    """
    espacios = query_all(sql, tuple(params) if params else None)
    
    for esp in espacios:
        horas = float(esp["horas_ocupadas"])
        esp["porcentaje_ocupacion"] = min(100, round((horas / 60.0) * 100, 1))

    return espacios

@router.get("/disponibles")
def get_espacios_disponibles(
    fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD"),
    hora_inicio: str = Query(..., description="Hora de inicio en formato HH:MM o HH:MM:SS"),
    hora_fin: str = Query(..., description="Hora de fin en formato HH:MM o HH:MM:SS"),
    categoria: Optional[str] = Query(None, description="Filtro opcional por categoria: clases, deportes, eventos")
):
    if len(hora_inicio) == 5:
        hora_inicio += ":00"
    if len(hora_fin) == 5:
        hora_fin += ":00"

    sql = """
        SELECT e.id_espacio, e.nombre_espacio, e.tipo, e.capacidad, e.categoria
        FROM espacio_academico e
        WHERE e.id_espacio NOT IN (
            SELECT cp.id_espacio
            FROM clase_programada cp
            WHERE cp.dia_semana = (
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
        )
        AND e.id_espacio NOT IN (
            SELECT ec.id_espacio
            FROM evento_comunitario ec
            WHERE ec.fecha_evento = %s
              AND ec.estado_evento = 'aprobado'
              AND (ec.hora_inicio < %s AND ec.hora_fin > %s)
        )
    """
    params = [fecha, hora_fin, hora_inicio, fecha, hora_fin, hora_inicio]
    if categoria:
        sql += " AND e.categoria LIKE %s"
        params.append(f"%{categoria}%")

    sql += " ORDER BY e.id_espacio ASC"
    
    disponibles = query_all(sql, tuple(params))
    return disponibles
