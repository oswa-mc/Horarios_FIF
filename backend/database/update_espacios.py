import os
import re
import pymysql

def generar_espacios():
    espacios = []
    
    # 3 Laboratorios de usos Multiples (B01…B03)
    for i in range(1, 4):
        espacios.append((f'Laboratorio de Usos Multiples B0{i}', 'laboratorio', 35, 'clases'))

    # 2 Laboratorios de redes (LR1, LR2)
    for i in range(1, 3):
        espacios.append((f'Laboratorio de Redes LR{i}', 'laboratorio', 30, 'clases'))

    # 1 laboratorio de electronica (LE)
    espacios.append(('Laboratorio de Electronica LE', 'laboratorio', 30, 'clases'))

    # 5 aulas de innovacion (I01….I05)
    for i in range(1, 6):
        espacios.append((f'Aula de Innovacion I0{i}', 'aula', 35, 'clases'))

    # 26 aulas (A01….A26)
    for i in range(1, 27):
        num_str = f'0{i}' if i < 10 else str(i)
        espacios.append((f'Aula A{num_str}', 'aula', 40, 'clases'))

    # 9 laboratorios de computo (D01..D09)
    for i in range(1, 10):
        espacios.append((f'Laboratorio de Computo D0{i}', 'laboratorio', 35, 'clases'))

    # Deportes: Caballo de troya, Arco Techo, Coliseo, Auditorio
    # Eventos, Reuniones, platicas... etc: Aula de usos multiples, Arco Techo, Coliseo, Auditorio
    espacios.append(('Caballo de Troya', 'deportivo', 120, 'deportes'))
    espacios.append(('Arco Techo', 'deportivo', 300, 'deportes,eventos'))
    espacios.append(('Coliseo', 'deportivo', 450, 'deportes,eventos'))
    espacios.append(('Auditorio', 'auditorio', 250, 'eventos,deportes'))
    espacios.append(('Aula de Usos Multiples', 'otro', 80, 'eventos'))

    # Formato final con IDs
    rows = []
    for idx, (nom, tipo, cap, cat) in enumerate(espacios, 1):
        rows.append((idx, nom, tipo, cap, cat))

    return rows

def actualizar_sql_file(rows, sql_path):
    with open(sql_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Definicion de tabla espacio_academico
    nueva_tabla_espacio = """CREATE TABLE espacio_academico (
  id_espacio     INT AUTO_INCREMENT PRIMARY KEY,
  nombre_espacio VARCHAR(100) NOT NULL,
  tipo           ENUM('aula','laboratorio','auditorio','sala_computo','deportivo','otro') NOT NULL DEFAULT 'aula',
  capacidad      INT NOT NULL DEFAULT 0,
  categoria      VARCHAR(50) NOT NULL DEFAULT 'clases'
) ENGINE=InnoDB;"""

    content = re.sub(
        r'CREATE TABLE espacio_academico \([^;]+;\s*',
        nueva_tabla_espacio + '\n\n',
        content,
        flags=re.MULTILINE
    )

    # 2. Bloque INSERT INTO espacio_academico
    insert_lines = [
        "-- -----------------------------------------------------",
        "-- ESPACIO_ACADEMICO (51 espacios de la facultad: aulas, laboratorios, deportes y eventos)",
        "-- -----------------------------------------------------",
        "INSERT INTO espacio_academico (id_espacio, nombre_espacio, tipo, capacidad, categoria) VALUES"
    ]
    val_lines = []
    for id_e, nom, tipo, cap, cat in rows:
        val_lines.append(f"({id_e}, '{nom}', '{tipo}', {cap}, '{cat}')")
    insert_block = ",\n".join(val_lines) + ";"

    content = re.sub(
        r'-- ESPACIO_ACADEMICO \(\d+\)\s+INSERT INTO espacio_academico [^;]+;',
        insert_lines[0] + '\n' + insert_lines[1] + '\n' + insert_lines[2] + '\n' + insert_lines[3] + '\n' + insert_block,
        content,
        flags=re.MULTILINE
    )

    # 3. Actualizar eventos para usar los espacios de eventos / deportes adecuados
    nuevos_eventos = """-- EVENTO_COMUNITARIO (12)
INSERT INTO evento_comunitario (id_evento, titulo, descripcion, fecha_evento, hora_inicio, hora_fin, estado_evento, id_proponente, id_aprobador, id_espacio) VALUES
(1,  'Feria de Ciencias',            'Exposicion de proyectos estudiantiles de todas las carreras', '2026-11-15', '10:00:00', '14:00:00', 'aprobado',  3,  1,    50),
(2,  'Torneo de Ajedrez',            'Torneo interno abierto a toda la comunidad universitaria',    '2026-11-05', '09:00:00', '15:00:00', 'aprobado',  7,  1,    48),
(3,  'Conferencia de Ciberseguridad','Charla con expertos de la industria',                         '2026-11-10', '16:00:00', '18:00:00', 'aprobado',  5,  2,    50),
(4,  'Taller de Programacion',       'Introduccion a Python para principiantes',                    '2026-11-12', '12:00:00', '15:00:00', 'pendiente', 8,  NULL, 38),
(5,  'Cine-debate',                  'Proyeccion y discusion de documental',                        '2026-11-18', '17:00:00', '20:00:00', 'pendiente', 9,  NULL, 51),
(6,  'Noche de Talentos',            'Presentaciones artisticas y musicales de alumnos',            '2026-11-20', '18:00:00', '21:00:00', 'aprobado',  10, 2,    49),
(7,  'Campana de Donacion de Sangre','En colaboracion con la Cruz Roja',                            '2026-11-08', '09:00:00', '13:00:00', 'aprobado',  4,  1,    51),
(8,  'Hackathon Universitario',      'Competencia de desarrollo de 24 horas',                       '2026-12-02', '09:00:00', '21:00:00', 'pendiente', 6,  NULL, 49),
(9,  'Concurso de Robotica',         'Competencia de robots autonomos',                             '2026-12-05', '10:00:00', '16:00:00', 'rechazado', 11, 2,    6),
(10, 'Posada Universitaria',         'Convivio de fin de semestre',                                 '2026-12-12', '17:00:00', '22:00:00', 'pendiente', 13, NULL, 48),
(11, 'Mesa Redonda de Egresados',    'Experiencias laborales de egresados',                         '2026-11-25', '11:00:00', '13:00:00', 'cancelado', 12, 1,    50),
(12, 'Jornada de Bienvenida',        'Actividades de integracion para alumnos de nuevo ingreso',    '2026-11-03', '09:00:00', '13:00:00', 'aprobado',  3,  1,    47);"""

    content = re.sub(
        r'-- EVENTO_COMUNITARIO \(\d+\)\s+INSERT INTO evento_comunitario [^;]+;',
        nuevos_eventos,
        content,
        flags=re.MULTILINE
    )

    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Archivo SQL {sql_path} actualizado exitosamente con los 51 espacios.")

def actualizar_base_datos(rows):
    conn = pymysql.connect(
        host="localhost",
        port=3306,
        user="root",
        password="",
        database="gestion_academica",
        charset="utf8mb4",
        autocommit=False
    )
    try:
        with conn.cursor() as cur:
            cur.execute("SET FOREIGN_KEY_CHECKS = 0;")

            # 1. Ajustar columnas de espacio_academico
            cur.execute("SHOW COLUMNS FROM espacio_academico LIKE 'categoria';")
            if not cur.fetchone():
                print("Agregando columna categoria a espacio_academico...")
                cur.execute("ALTER TABLE espacio_academico ADD COLUMN categoria VARCHAR(50) NOT NULL DEFAULT 'clases';")

            cur.execute("ALTER TABLE espacio_academico MODIFY COLUMN tipo ENUM('aula','laboratorio','auditorio','sala_computo','deportivo','otro') NOT NULL DEFAULT 'aula';")

            # 2. Truncar e insertar los 51 espacios
            cur.execute("TRUNCATE TABLE espacio_academico;")
            sql_insert = "INSERT INTO espacio_academico (id_espacio, nombre_espacio, tipo, capacidad, categoria) VALUES (%s, %s, %s, %s, %s)"
            cur.executemany(sql_insert, rows)

            # 3. Actualizar eventos comunitarios para vincularlos a los nuevos espacios
            map_eventos_espacios = {
                1: 50,  # Feria de Ciencias -> Auditorio
                2: 48,  # Torneo de Ajedrez -> Arco Techo
                3: 50,  # Conferencia de Ciberseguridad -> Auditorio
                4: 38,  # Taller de Programacion -> Laboratorio de Computo D01
                5: 51,  # Cine-debate -> Aula de Usos Multiples
                6: 49,  # Noche de Talentos -> Coliseo
                7: 51,  # Campana de Donacion de Sangre -> Aula de Usos Multiples
                8: 49,  # Hackathon Universitario -> Coliseo
                9: 6,   # Concurso de Robotica -> Laboratorio de Electronica LE
                10: 48, # Posada Universitaria -> Arco Techo
                11: 50, # Mesa Redonda de Egresados -> Auditorio
                12: 47, # Jornada de Bienvenida -> Caballo de Troya
            }
            for id_ev, id_esp in map_eventos_espacios.items():
                cur.execute("UPDATE evento_comunitario SET id_espacio = %s WHERE id_evento = %s;", (id_esp, id_ev))

            cur.execute("SET FOREIGN_KEY_CHECKS = 1;")
            conn.commit()
            print(f"Base de datos MySQL actualizada exitosamente con los {len(rows)} espacios.")
    except Exception as e:
        conn.rollback()
        print("Error al actualizar espacios en base de datos:", e)
        raise e
    finally:
        conn.close()

if __name__ == '__main__':
    sql_path = os.path.join(os.path.dirname(__file__), 'gestion_academica.sql')
    rows = generar_espacios()
    print(f"Generados {len(rows)} espacios academicos.")
    actualizar_sql_file(rows, sql_path)
    actualizar_base_datos(rows)
