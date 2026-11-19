from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any

try:
    from database import query_all, query_one, execute_write
    from schemas import ClaseCreate, EventoStatusUpdate, GenerarHorarioRequest, GuardarLoteRequest
    from auth import require_role, get_current_user
    from routers.eventos import verificar_conflicto_evento
except ImportError:
    from backend.database import query_all, query_one, execute_write
    from backend.schemas import ClaseCreate, EventoStatusUpdate, GenerarHorarioRequest, GuardarLoteRequest
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
            m.carrera,
            m.semestre,
            m.horas_teoria,
            m.horas_practica,
            u.id_usuario as id_docente,
            u.nombre as nombre_docente,
            u.expediente as expediente_docente,
            e.id_espacio,
            e.nombre_espacio,
            e.tipo as tipo_espacio,
            e.capacidad as capacidad_espacio,
            e.categoria as categoria_espacio,
            COUNT(DISTINCT ca.id_alumno) as total_alumnos
        FROM clase_programada cp
        JOIN materia m ON cp.id_materia = m.id_materia
        JOIN usuario u ON cp.id_docente = u.id_usuario
        JOIN espacio_academico e ON cp.id_espacio = e.id_espacio
        LEFT JOIN carga_academica_alumno ca ON cp.id_clase = ca.id_clase
        GROUP BY cp.id_clase, cp.dia_semana, cp.hora_inicio, cp.hora_fin, cp.periodo_lectivo,
                 m.id_materia, m.clave_materia, m.nombre_materia, m.carrera, m.semestre, u.id_usuario, u.nombre,
                 u.expediente, e.id_espacio, e.nombre_espacio, e.tipo, e.capacidad, e.categoria
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

# =====================================================================
# PLANIFICADOR DE HORARIOS POR SEMESTRE (LUNES A JUEVES, 07:00 A 19:00)
# =====================================================================

DIAS_CLASE_OFICIALES = ['lunes', 'martes', 'miercoles', 'jueves']
BLOQUES_HORARIO_OFICIALES = [
    ('07:00:00', '09:00:00'),
    ('09:00:00', '11:00:00'),
    ('11:00:00', '13:00:00'),
    ('13:00:00', '15:00:00'),
    ('15:00:00', '17:00:00'),
    ('17:00:00', '19:00:00')
]

def clasificar_espacio_materia(nom_materia: str, horas_practica: int = 0) -> str:
    nom = nom_materia.lower()
    if any(k in nom for k in ['deporte', 'cultura fisica']):
        return 'deportes'
    if any(k in nom for k in ['redes', 'ruteo', 'conmutacion', 'telefonia', 'telecomunicacion', 'antenas', 'lineas de transmision', 'interconectividad', 'seguridad en redes', 'protocolos de comunicacion']):
        return 'lab_redes'
    if any(k in nom for k in ['electronica', 'circuito', 'sistemas digitales', 'hardware', 'instrumentacion', 'dispositivos programables', 'logica digital', 'sistemas minimos', 'electricidad y magnetismo']):
        return 'lab_electronica'
    if any(k in nom for k in [
        'programacion', 'base de datos', 'bases de datos', 'software', 'desarrollo web', 'desarrollo de sistemas', 'apps', 'movil',
        'algoritmo', 'estructura de datos', 'estructuras de datos', 'inteligencia artificial', 'aprendizaje maquina',
        'big data', 'cloud computing', 'servicios cloud', 'seguridad cloud', 'sistemas operativos', 'interfaces de software', 'ciencia de datos',
        'computacion forense', 'ciberseguridad', 'mineria de datos', 'modelos predictivos',
        'visualizacion y despliegue de datos', 'sistemas embebidos', 'automatizacion', 'interoperables', 'sistemas distribuidos'
    ]):
        return 'lab_computo'
    return 'aula'

def seleccionar_espacio_adecuado(espacios, tipo_requerido, dia, h_ini, h_fin, ocupados_espacio):
    candidatos = []
    if tipo_requerido == 'deportes':
        candidatos = [e for e in espacios if (e.get('categoria') and 'deportes' in e['categoria']) or e.get('tipo') == 'deportivo']
    elif tipo_requerido == 'lab_redes':
        candidatos = [e for e in espacios if 'Laboratorio de Redes' in e['nombre_espacio']]
    elif tipo_requerido == 'lab_electronica':
        candidatos = [e for e in espacios if 'Laboratorio de Electronica' in e['nombre_espacio']]
    elif tipo_requerido == 'lab_computo':
        candidatos = [e for e in espacios if 'Laboratorio de Computo' in e['nombre_espacio']]
        if not candidatos:
            candidatos = [e for e in espacios if 'Laboratorio de Usos Multiples' in e['nombre_espacio']]
    else:
        candidatos = [e for e in espacios if e['nombre_espacio'].startswith('Aula A') or e['nombre_espacio'].startswith('Aula de Innovacion')]

    for esp in candidatos:
        key = (esp['id_espacio'], dia, h_ini, h_fin)
        if key not in ocupados_espacio:
            return esp

    for esp in espacios:
        key = (esp['id_espacio'], dia, h_ini, h_fin)
        if key not in ocupados_espacio:
            return esp

    return candidatos[0] if candidatos else espacios[0]

@router.post("/horarios/generar")
def generar_horarios_semestre(payload: GenerarHorarioRequest):
    # Consultar materias a programar
    sql_mats = "SELECT * FROM materia WHERE 1=1"
    params_mats = []
    if payload.carrera and payload.carrera.lower() != 'todas':
        sql_mats += " AND carrera = %s"
        params_mats.append(payload.carrera)
    if payload.semestre:
        sql_mats += " AND semestre = %s"
        params_mats.append(payload.semestre)
    sql_mats += " ORDER BY carrera ASC, semestre ASC, clave_materia ASC"
    materias = query_all(sql_mats, tuple(params_mats))

    if not materias:
        raise HTTPException(status_code=404, detail="No se encontraron materias con los criterios seleccionados.")

    # Consultar docentes y espacios
    docentes = query_all("SELECT id_usuario, nombre, expediente FROM usuario WHERE rol = 'docente' ORDER BY id_usuario ASC")
    espacios = query_all("SELECT id_espacio, nombre_espacio, tipo, capacidad, categoria FROM espacio_academico ORDER BY id_espacio ASC")

    if not docentes or not espacios:
        raise HTTPException(status_code=500, detail="No hay docentes o espacios registrados en la base de datos.")

    # Ocupacion previa en la base de datos
    clases_existentes = query_all(
        "SELECT cp.id_espacio, cp.id_docente, cp.dia_semana, cp.hora_inicio, cp.hora_fin, m.carrera, m.semestre "
        "FROM clase_programada cp JOIN materia m ON cp.id_materia = m.id_materia "
        "WHERE cp.periodo_lectivo = %s",
        (payload.periodo_lectivo,)
    )

    ocupados_espacio = set()
    ocupados_docente = set()
    ocupados_cohorte = set()

    # Si se van a reemplazar las clases de esta carrera/semestre, no las cargamos en occupied
    for c in clases_existentes:
        # Normalizar horas
        h_i = str(c['hora_inicio'])
        h_f = str(c['hora_fin'])
        if len(h_i) == 5: h_i += ":00"
        if len(h_f) == 5: h_f += ":00"

        c_car = c['carrera']
        c_sem = c['semestre']
        es_mismo_objetivo = (
            (payload.carrera.lower() == 'todas' or c_car == payload.carrera) and
            (not payload.semestre or c_sem == payload.semestre)
        )
        if not payload.guardar or not es_mismo_objetivo:
            ocupados_espacio.add((c['id_espacio'], c['dia_semana'], h_i, h_f))
            ocupados_docente.add((c['id_docente'], c['dia_semana'], h_i, h_f))
            ocupados_cohorte.add((c_car, c_sem, c['dia_semana'], h_i, h_f))

    # Definir bloques segun turno
    if payload.turno == 'vespertino':
        bloques_usar = BLOQUES_HORARIO_OFICIALES[3:6] # 13:00 a 19:00
    elif payload.turno == 'mixto':
        bloques_usar = BLOQUES_HORARIO_OFICIALES # 07:00 a 19:00
    else:
        bloques_usar = BLOQUES_HORARIO_OFICIALES[0:4] # 07:00 a 15:00 (matutino, max 4 por dia)

    # Agrupar materias por cohorte (carrera, semestre)
    cohortes = {}
    for m in materias:
        key = (m['carrera'], m['semestre'])
        if key not in cohortes:
            cohortes[key] = []
        cohortes[key].append(m)

    clases_generadas = []
    docente_rot_idx = 0

    # Pares clasicos de programacion universitaria para cumplir las horas de la semana
    # Cada materia de 4 hrs semanales recibe 2 sesiones de 2 horas (ej. lunes y miercoles, o martes y jueves)
    for (car, sem), mats in cohortes.items():
        mitad = (len(mats) + 1) // 2
        grupo_lm = mats[:mitad]
        grupo_mj = mats[mitad:]

        pares_asignacion = [
            (grupo_lm, ('lunes', 'miercoles')),
            (grupo_mj, ('martes', 'jueves'))
        ]

        for mats_subgrupo, (dia1, dia2) in pares_asignacion:
            for b_idx, m in enumerate(mats_subgrupo):
                bloque_actual = bloques_usar[b_idx % len(bloques_usar)]
                h_ini, h_fin = bloque_actual

                ht = m.get('horas_teoria', 2)
                hp = m.get('horas_practica', 2)

                # Criterio interno para asignacion de salones vs laboratorios
                tipo_lab = clasificar_espacio_materia(m['nombre_materia'], hp)
                if ht > 0 and hp > 0:
                    # 2T, 2P -> Sesion 1 en Aula (Teoria), Sesion 2 en Laboratorio especializado (Practica)
                    tipo_sesion1 = 'aula'
                    tipo_sesion2 = tipo_lab
                elif ht > 0 and hp == 0:
                    # 4T, 0P -> Ambas sesiones en Aula
                    tipo_sesion1 = 'aula'
                    tipo_sesion2 = 'aula'
                else:
                    # 0T, 4P -> Ambas sesiones en Deportes / Practica
                    tipo_sesion1 = tipo_lab
                    tipo_sesion2 = tipo_lab

                # Docente para la asignatura
                docente_libre = None
                for d_offset in range(len(docentes)):
                    cand = docentes[(docente_rot_idx + d_offset) % len(docentes)]
                    k1 = (cand['id_usuario'], dia1, h_ini, h_fin)
                    k2 = (cand['id_usuario'], dia2, h_ini, h_fin)
                    if k1 not in ocupados_docente and k2 not in ocupados_docente:
                        docente_libre = cand
                        docente_rot_idx = (docente_rot_idx + d_offset + 1) % len(docentes)
                        break
                if not docente_libre:
                    docente_libre = docentes[docente_rot_idx % len(docentes)]
                    docente_rot_idx += 1

                # Sesion 1 (dia1)
                esp1 = seleccionar_espacio_adecuado(espacios, tipo_sesion1, dia1, h_ini, h_fin, ocupados_espacio)
                ocupados_cohorte.add((car, sem, dia1, h_ini, h_fin))
                ocupados_docente.add((docente_libre['id_usuario'], dia1, h_ini, h_fin))
                ocupados_espacio.add((esp1['id_espacio'], dia1, h_ini, h_fin))

                clases_generadas.append({
                    "id_materia": m["id_materia"],
                    "clave_materia": m["clave_materia"],
                    "nombre_materia": m["nombre_materia"],
                    "carrera": car,
                    "semestre": sem,
                    "horas_teoria": ht,
                    "horas_practica": hp,
                    "tipo_espacio_requerido": tipo_sesion1,
                    "id_docente": docente_libre["id_usuario"],
                    "nombre_docente": docente_libre["nombre"],
                    "id_espacio": esp1["id_espacio"],
                    "nombre_espacio": esp1["nombre_espacio"],
                    "tipo_espacio": esp1.get("tipo", "aula"),
                    "dia_semana": dia1,
                    "hora_inicio": h_ini[:5],
                    "hora_fin": h_fin[:5],
                    "periodo_lectivo": payload.periodo_lectivo
                })

                # Sesion 2 (dia2)
                esp2 = seleccionar_espacio_adecuado(espacios, tipo_sesion2, dia2, h_ini, h_fin, ocupados_espacio)
                ocupados_cohorte.add((car, sem, dia2, h_ini, h_fin))
                ocupados_docente.add((docente_libre['id_usuario'], dia2, h_ini, h_fin))
                ocupados_espacio.add((esp2['id_espacio'], dia2, h_ini, h_fin))

                clases_generadas.append({
                    "id_materia": m["id_materia"],
                    "clave_materia": m["clave_materia"],
                    "nombre_materia": m["nombre_materia"],
                    "carrera": car,
                    "semestre": sem,
                    "horas_teoria": ht,
                    "horas_practica": hp,
                    "tipo_espacio_requerido": tipo_sesion2,
                    "id_docente": docente_libre["id_usuario"],
                    "nombre_docente": docente_libre["nombre"],
                    "id_espacio": esp2["id_espacio"],
                    "nombre_espacio": esp2["nombre_espacio"],
                    "tipo_espacio": esp2.get("tipo", "aula"),
                    "dia_semana": dia2,
                    "hora_inicio": h_ini[:5],
                    "hora_fin": h_fin[:5],
                    "periodo_lectivo": payload.periodo_lectivo
                })

    # Si se solicito guardar directamente en la base de datos
    if payload.guardar and clases_generadas:
        # 1. Limpiar clases previas del objetivo
        if payload.carrera.lower() == 'todas':
            if payload.semestre:
                execute_write(
                    "DELETE cp FROM clase_programada cp JOIN materia m ON cp.id_materia = m.id_materia WHERE m.semestre = %s AND cp.periodo_lectivo = %s",
                    (payload.semestre, payload.periodo_lectivo)
                )
            else:
                execute_write(
                    "DELETE FROM clase_programada WHERE periodo_lectivo = %s",
                    (payload.periodo_lectivo,)
                )
        else:
            if payload.semestre:
                execute_write(
                    "DELETE cp FROM clase_programada cp JOIN materia m ON cp.id_materia = m.id_materia WHERE m.carrera = %s AND m.semestre = %s AND cp.periodo_lectivo = %s",
                    (payload.carrera, payload.semestre, payload.periodo_lectivo)
                )
            else:
                execute_write(
                    "DELETE cp FROM clase_programada cp JOIN materia m ON cp.id_materia = m.id_materia WHERE m.carrera = %s AND cp.periodo_lectivo = %s",
                    (payload.carrera, payload.periodo_lectivo)
                )

        # 2. Insertar las clases generadas
        insert_sql = "INSERT INTO clase_programada (id_materia, id_docente, id_espacio, dia_semana, hora_inicio, hora_fin, periodo_lectivo) VALUES (%s, %s, %s, %s, %s, %s, %s)"
        for cg in clases_generadas:
            execute_write(insert_sql, (
                cg["id_materia"],
                cg["id_docente"],
                cg["id_espacio"],
                cg["dia_semana"],
                cg["hora_inicio"] + ":00",
                cg["hora_fin"] + ":00",
                cg["periodo_lectivo"]
            ))

    return {
        "carrera": payload.carrera,
        "semestre": payload.semestre,
        "total_clases_generadas": len(clases_generadas),
        "guardadas_en_bd": payload.guardar,
        "clases": clases_generadas
    }

@router.post("/horarios/guardar-lote")
def guardar_horarios_lote(payload: GuardarLoteRequest):
    if not payload.clases:
        raise HTTPException(status_code=400, detail="No se enviaron clases para guardar.")

    # Si se pide limpiar clases anteriores del objetivo
    if payload.limpiar_anteriores:
        if payload.carrera and payload.carrera.lower() != 'todas':
            if payload.semestre:
                execute_write(
                    "DELETE cp FROM clase_programada cp JOIN materia m ON cp.id_materia = m.id_materia WHERE m.carrera = %s AND m.semestre = %s AND cp.periodo_lectivo = %s",
                    (payload.carrera, payload.semestre, payload.periodo_lectivo)
                )
            else:
                execute_write(
                    "DELETE cp FROM clase_programada cp JOIN materia m ON cp.id_materia = m.id_materia WHERE m.carrera = %s AND cp.periodo_lectivo = %s",
                    (payload.carrera, payload.periodo_lectivo)
                )

    insert_sql = "INSERT INTO clase_programada (id_materia, id_docente, id_espacio, dia_semana, hora_inicio, hora_fin, periodo_lectivo) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    insertadas = 0
    for c in payload.clases:
        h_ini = c.hora_inicio if len(c.hora_inicio) == 8 else c.hora_inicio + ":00"
        h_fin = c.hora_fin if len(c.hora_fin) == 8 else c.hora_fin + ":00"
        execute_write(insert_sql, (
            c.id_materia,
            c.id_docente,
            c.id_espacio,
            c.dia_semana,
            h_ini,
            h_fin,
            c.periodo_lectivo
        ))
        insertadas += 1

    return {
        "message": f"Se guardaron {insertadas} clases exitosamente en la base de datos",
        "total_insertadas": insertadas
    }

@router.delete("/horarios/limpiar")
def limpiar_horarios_semestre(carrera: str, semestre: int, periodo_lectivo: str = "2026-2"):
    execute_write(
        "DELETE cp FROM clase_programada cp JOIN materia m ON cp.id_materia = m.id_materia WHERE m.carrera = %s AND m.semestre = %s AND cp.periodo_lectivo = %s",
        (carrera, semestre, periodo_lectivo)
    )
    return {"message": f"Clases eliminadas para {carrera} Semestre {semestre}"}


