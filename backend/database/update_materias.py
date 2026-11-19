import zipfile
import xml.etree.ElementTree as ET
import re
import os
import pymysql

def quitar_acentos(texto):
    reemplazos = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
        'ñ': 'n', 'Ñ': 'N'
    }
    for k, v in reemplazos.items():
        texto = texto.replace(k, v)
    return texto

def parse_docx(path_docx):
    with zipfile.ZipFile(path_docx) as docx:
        tree = ET.fromstring(docx.read('word/document.xml'))
        texts = [''.join(node.text for node in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text).strip() for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')]
        texts = [t for t in texts if t]

    carrera_actual = None
    rows = []
    id_materia = 1

    for line in texts:
        m_car = re.match(r'^([A-Z0-9]+):?$', line)
        if m_car:
            carrera_actual = m_car.group(1)
            continue
        m_sem = re.match(r'^Semestre\s+(\d+):\s*(.*)$', line, re.IGNORECASE)
        if m_sem and carrera_actual:
            semestre_num = int(m_sem.group(1))
            content = m_sem.group(2).strip()
            # Patrón para materias con horas teóricas y prácticas: (XT, YP)
            parts = re.findall(r'(.*?\((\d+)T,\s*(\d+)P\))(?:\s*,\s*|$)', content)
            for idx, (full, t_hrs, p_hrs) in enumerate(parts, 1):
                name = re.sub(r'\s*\(\d+T,\s*\d+P\)$', '', full).strip()
                name_clean = quitar_acentos(name)
                clave = f'{carrera_actual}-{semestre_num}{idx:02d}'
                rows.append((id_materia, clave, name_clean, carrera_actual, semestre_num, int(t_hrs), int(p_hrs)))
                id_materia += 1

    return rows

def actualizar_sql_file(rows, sql_path):
    with open(sql_path, 'r', encoding='utf-8') as f:
        content = f.read()

    nueva_tabla_materia = """CREATE TABLE materia (
  id_materia     INT AUTO_INCREMENT PRIMARY KEY,
  clave_materia  VARCHAR(30)  NOT NULL UNIQUE,
  nombre_materia VARCHAR(150) NOT NULL,
  carrera        VARCHAR(20)  NOT NULL,
  semestre       INT          NOT NULL,
  horas_teoria   INT          NOT NULL DEFAULT 2,
  horas_practica INT          NOT NULL DEFAULT 2,
  INDEX idx_carrera_semestre (carrera, semestre)
) ENGINE=InnoDB;"""

    content = re.sub(
        r'CREATE TABLE materia \([^;]+;\s*',
        nueva_tabla_materia + '\n\n',
        content
    )

    insert_header = (
        "-- -----------------------------------------------------\n"
        f"-- MATERIA ({len(rows)} materias oficiales de materias.docx por carrera y semestre)\n"
        "-- -----------------------------------------------------\n"
        "INSERT INTO materia (id_materia, clave_materia, nombre_materia, carrera, semestre, horas_teoria, horas_practica) VALUES\n"
    )
    val_lines = []
    for id_m, clave, nom, car, sem, ht, hp in rows:
        nom_esc = nom.replace("'", "\\'")
        val_lines.append(f"({id_m}, '{clave}', '{nom_esc}', '{car}', {sem}, {ht}, {hp})")
    
    insert_block = insert_header + ",\n".join(val_lines) + ";\n\n"

    pattern = r'-- -+\s*\n-- MATERIA[^\n]*\n-- -+\s*\nINSERT INTO materia [^;]+;\s*'
    content, count = re.subn(pattern, insert_block, content)
    if count == 0:
        print("Aviso: Reemplazando bloque de materias con busqueda de delimitadores...")
        start_idx = content.find("-- MATERIA")
        if start_idx != -1:
            prev_dash = content.rfind("-- ----", 0, start_idx)
            if prev_dash != -1:
                start_idx = prev_dash
            end_idx = content.find("-- ESPACIO_ACADEMICO", start_idx)
            if end_idx != -1:
                dash_before_espacio = content.rfind("-- ----", 0, end_idx)
                if dash_before_espacio != -1:
                    end_idx = dash_before_espacio
                content = content[:start_idx] + insert_block + content[end_idx:]

    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Archivo SQL {sql_path} actualizado correctamente con las {len(rows)} materias.")

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
            
            # Asegurar columnas necesarias en materia
            cur.execute("SHOW COLUMNS FROM materia LIKE 'horas_teoria';")
            if not cur.fetchone():
                print("Agregando columnas horas_teoria y horas_practica a materia...")
                cur.execute("ALTER TABLE materia ADD COLUMN horas_teoria INT NOT NULL DEFAULT 2, ADD COLUMN horas_practica INT NOT NULL DEFAULT 2;")

            # Truncar tabla de materias
            cur.execute("TRUNCATE TABLE materia;")

            # Insertar las 323 nuevas materias oficiales
            sql_insert = "INSERT INTO materia (id_materia, clave_materia, nombre_materia, carrera, semestre, horas_teoria, horas_practica) VALUES (%s, %s, %s, %s, %s, %s, %s)"
            cur.executemany(sql_insert, rows)

            cur.execute("SET FOREIGN_KEY_CHECKS = 1;")
            conn.commit()
            print(f"Base de datos MySQL actualizada exitosamente: {len(rows)} materias insertadas.")
    except Exception as e:
        conn.rollback()
        print("Error al actualizar base de datos:", e)
        raise e
    finally:
        conn.close()

if __name__ == '__main__':
    docx_path = os.path.join(os.path.dirname(__file__), '..', '..', 'materias.docx')
    if not os.path.exists(docx_path):
        docx_path = 'materias.docx'
    
    sql_path = os.path.join(os.path.dirname(__file__), 'gestion_academica.sql')

    rows = parse_docx(docx_path)
    print(f"Parseadas {len(rows)} materias oficiales desde {docx_path}")

    actualizar_sql_file(rows, sql_path)
    actualizar_base_datos(rows)
