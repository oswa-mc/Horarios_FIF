-- =====================================================
-- Base de datos: gestion_academica (VERSIÓN DE PRUEBA)
-- Compatible con XAMPP (MySQL / MariaDB)
-- Importar desde phpMyAdmin > Importar
-- Incluye datos ficticios para probar el sistema.
-- =====================================================

DROP DATABASE IF EXISTS gestion_academica;
CREATE DATABASE gestion_academica
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;
USE gestion_academica;

-- -----------------------------------------------------
-- USUARIO
-- -----------------------------------------------------
CREATE TABLE usuario (
  id_usuario   INT AUTO_INCREMENT PRIMARY KEY,
  tipo_usuario VARCHAR(50)  NOT NULL,
  expediente   VARCHAR(30)  NOT NULL UNIQUE,
  nombre       VARCHAR(150) NOT NULL,
  correo       VARCHAR(150) NOT NULL UNIQUE,
  contrasena   VARCHAR(255) NOT NULL,
  rol          ENUM('alumno','docente','administrador') NOT NULL DEFAULT 'alumno'
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- MATERIA
-- -----------------------------------------------------
CREATE TABLE materia (
  id_materia     INT AUTO_INCREMENT PRIMARY KEY,
  clave_materia  VARCHAR(20)  NOT NULL UNIQUE,
  nombre_materia VARCHAR(150) NOT NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- ESPACIO_ACADEMICO
-- -----------------------------------------------------
CREATE TABLE espacio_academico (
  id_espacio     INT AUTO_INCREMENT PRIMARY KEY,
  nombre_espacio VARCHAR(100) NOT NULL,
  tipo           ENUM('aula','laboratorio','auditorio','sala_computo','otro') NOT NULL DEFAULT 'aula',
  capacidad      INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- CLASE_PROGRAMADA
-- -----------------------------------------------------
CREATE TABLE clase_programada (
  id_clase        INT AUTO_INCREMENT PRIMARY KEY,
  id_materia      INT NOT NULL,
  id_docente      INT NOT NULL,
  id_espacio      INT NOT NULL,
  dia_semana      ENUM('lunes','martes','miercoles','jueves','viernes','sabado') NOT NULL,
  hora_inicio     TIME NOT NULL,
  hora_fin        TIME NOT NULL,
  periodo_lectivo VARCHAR(20) NOT NULL,
  CONSTRAINT fk_clase_materia FOREIGN KEY (id_materia)
    REFERENCES materia(id_materia) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_clase_docente FOREIGN KEY (id_docente)
    REFERENCES usuario(id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_clase_espacio FOREIGN KEY (id_espacio)
    REFERENCES espacio_academico(id_espacio) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- CARGA_ACADEMICA_ALUMNO
-- -----------------------------------------------------
CREATE TABLE carga_academica_alumno (
  id_inscripcion INT AUTO_INCREMENT PRIMARY KEY,
  id_alumno      INT NOT NULL,
  id_clase       INT NOT NULL,
  UNIQUE KEY uq_alumno_clase (id_alumno, id_clase),
  CONSTRAINT fk_carga_alumno FOREIGN KEY (id_alumno)
    REFERENCES usuario(id_usuario) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_carga_clase FOREIGN KEY (id_clase)
    REFERENCES clase_programada(id_clase) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- REGISTRO_ESTADO_CLASE
-- -----------------------------------------------------
CREATE TABLE registro_estado_clase (
  id_estado_clase INT AUTO_INCREMENT PRIMARY KEY,
  id_clase        INT NOT NULL,
  fecha           DATE NOT NULL,
  estado          ENUM('normal','cancelada','virtual','reprogramada') NOT NULL DEFAULT 'normal',
  enlace_virtual  VARCHAR(255) NULL,
  observaciones   TEXT NULL,
  CONSTRAINT fk_estado_clase FOREIGN KEY (id_clase)
    REFERENCES clase_programada(id_clase) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- EVENTO_COMUNITARIO
-- -----------------------------------------------------
CREATE TABLE evento_comunitario (
  id_evento     INT AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(150) NOT NULL,
  descripcion   TEXT NULL,
  fecha_evento  DATE NOT NULL,
  hora_inicio   TIME NOT NULL,
  hora_fin      TIME NOT NULL,
  estado_evento ENUM('pendiente','aprobado','rechazado','cancelado') NOT NULL DEFAULT 'pendiente',
  id_proponente INT NOT NULL,
  id_aprobador  INT NULL,
  id_espacio    INT NOT NULL,
  CONSTRAINT fk_evento_proponente FOREIGN KEY (id_proponente)
    REFERENCES usuario(id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_evento_aprobador FOREIGN KEY (id_aprobador)
    REFERENCES usuario(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_evento_espacio FOREIGN KEY (id_espacio)
    REFERENCES espacio_academico(id_espacio) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================
-- DATOS DE PRUEBA
-- Contraseña de todos los usuarios de prueba: prueba123
-- (en texto plano solo para pruebas; en producción usar hash)
-- =====================================================

-- USUARIO (15): 2 administradores, 4 docentes, 9 alumnos
INSERT INTO usuario (id_usuario, tipo_usuario, expediente, nombre, correo, contrasena, rol) VALUES
(1,  'Administrativo', 'ADM001',  'Laura Ramírez Soto',      'laura.ramirez@uni.mx',   'prueba123', 'administrador'),
(2,  'Administrativo', 'ADM002',  'Roberto Cruz Medina',     'roberto.cruz@uni.mx',    'prueba123', 'administrador'),
(3,  'Docente',        'DOC001',  'Juan Pérez Hernández',    'juan.perez@uni.mx',      'prueba123', 'docente'),
(4,  'Docente',        'DOC002',  'Ana Martínez Vega',       'ana.martinez@uni.mx',    'prueba123', 'docente'),
(5,  'Docente',        'DOC003',  'Carlos Sánchez Ruiz',     'carlos.sanchez@uni.mx',  'prueba123', 'docente'),
(6,  'Docente',        'DOC004',  'Patricia Gómez Torres',   'patricia.gomez@uni.mx',  'prueba123', 'docente'),
(7,  'Alumno',         '2024001', 'María López García',      'maria.lopez@uni.mx',     'prueba123', 'alumno'),
(8,  'Alumno',         '2024002', 'Diego Hernández Luna',    'diego.hernandez@uni.mx', 'prueba123', 'alumno'),
(9,  'Alumno',         '2024003', 'Sofía Ramos Ortega',      'sofia.ramos@uni.mx',     'prueba123', 'alumno'),
(10, 'Alumno',         '2024004', 'Luis Fernández Castro',   'luis.fernandez@uni.mx',  'prueba123', 'alumno'),
(11, 'Alumno',         '2024005', 'Valeria Morales Díaz',    'valeria.morales@uni.mx', 'prueba123', 'alumno'),
(12, 'Alumno',         '2024006', 'Andrés Jiménez Pineda',   'andres.jimenez@uni.mx',  'prueba123', 'alumno'),
(13, 'Alumno',         '2024007', 'Camila Vargas Rojas',     'camila.vargas@uni.mx',   'prueba123', 'alumno'),
(14, 'Alumno',         '2024008', 'Emilio Torres Navarro',   'emilio.torres@uni.mx',   'prueba123', 'alumno'),
(15, 'Alumno',         '2024009', 'Fernanda Aguilar Mora',   'fernanda.aguilar@uni.mx','prueba123', 'alumno');

-- MATERIA (12)
INSERT INTO materia (id_materia, clave_materia, nombre_materia) VALUES
(1,  'BD101',  'Bases de Datos'),
(2,  'PRG102', 'Programación'),
(3,  'MAT103', 'Cálculo Diferencial'),
(4,  'FIS104', 'Física General'),
(5,  'RED105', 'Redes de Computadoras'),
(6,  'ING106', 'Ingeniería de Software'),
(7,  'EST107', 'Estadística'),
(8,  'SOP108', 'Sistemas Operativos'),
(9,  'ALG109', 'Álgebra Lineal'),
(10, 'ETC110', 'Ética Profesional'),
(11, 'IAR111', 'Inteligencia Artificial'),
(12, 'WEB112', 'Desarrollo Web');

-- ESPACIO_ACADEMICO (12)
INSERT INTO espacio_academico (id_espacio, nombre_espacio, tipo, capacidad) VALUES
(1,  'Aula 101',                  'aula',         40),
(2,  'Aula 102',                  'aula',         40),
(3,  'Aula 201',                  'aula',         35),
(4,  'Aula 202',                  'aula',         35),
(5,  'Laboratorio de Cómputo 1',  'laboratorio',  30),
(6,  'Laboratorio de Cómputo 2',  'laboratorio',  30),
(7,  'Laboratorio de Física',     'laboratorio',  25),
(8,  'Sala de Cómputo A',         'sala_computo', 45),
(9,  'Sala de Cómputo B',         'sala_computo', 45),
(10, 'Auditorio Principal',       'auditorio',    200),
(11, 'Sala de Usos Múltiples',    'otro',         60),
(12, 'Aula Magna',                'auditorio',    150);

-- CLASE_PROGRAMADA (15)
INSERT INTO clase_programada (id_clase, id_materia, id_docente, id_espacio, dia_semana, hora_inicio, hora_fin, periodo_lectivo) VALUES
(1,  1,  3, 5, 'lunes',     '08:00:00', '10:00:00', '2026-2'),
(2,  2,  3, 6, 'martes',    '08:00:00', '10:00:00', '2026-2'),
(3,  3,  4, 1, 'lunes',     '10:00:00', '12:00:00', '2026-2'),
(4,  4,  4, 7, 'miercoles', '10:00:00', '12:00:00', '2026-2'),
(5,  5,  5, 8, 'jueves',    '12:00:00', '14:00:00', '2026-2'),
(6,  6,  5, 2, 'viernes',   '08:00:00', '10:00:00', '2026-2'),
(7,  7,  6, 3, 'martes',    '10:00:00', '12:00:00', '2026-2'),
(8,  8,  6, 9, 'miercoles', '08:00:00', '10:00:00', '2026-2'),
(9,  9,  4, 4, 'jueves',    '08:00:00', '10:00:00', '2026-2'),
(10, 10, 3, 1, 'viernes',   '10:00:00', '12:00:00', '2026-2'),
(11, 11, 5, 6, 'lunes',     '12:00:00', '14:00:00', '2026-2'),
(12, 12, 6, 5, 'jueves',    '10:00:00', '12:00:00', '2026-2'),
(13, 1,  3, 5, 'miercoles', '12:00:00', '14:00:00', '2026-2'),
(14, 2,  4, 6, 'viernes',   '12:00:00', '14:00:00', '2026-2'),
(15, 3,  6, 2, 'martes',    '12:00:00', '14:00:00', '2026-2');

-- CARGA_ACADEMICA_ALUMNO (15)
INSERT INTO carga_academica_alumno (id_inscripcion, id_alumno, id_clase) VALUES
(1,  7,  1),
(2,  7,  3),
(3,  8,  1),
(4,  8,  2),
(5,  9,  3),
(6,  9,  4),
(7,  10, 2),
(8,  10, 6),
(9,  11, 11),
(10, 11, 9),
(11, 12, 13),
(12, 13, 14),
(13, 13, 10),
(14, 14, 5),
(15, 15, 12);

-- REGISTRO_ESTADO_CLASE (15)
INSERT INTO registro_estado_clase (id_estado_clase, id_clase, fecha, estado, enlace_virtual, observaciones) VALUES
(1,  1,  '2026-10-19', 'normal',       NULL, 'Clase presencial con normalidad'),
(2,  1,  '2026-10-26', 'normal',       NULL, NULL),
(3,  2,  '2026-10-20', 'virtual',      'https://meet.google.com/abc-defg-hij', 'Mantenimiento en laboratorio'),
(4,  3,  '2026-10-19', 'normal',       NULL, NULL),
(5,  3,  '2026-10-26', 'cancelada',    NULL, 'Docente en congreso académico'),
(6,  4,  '2026-10-21', 'normal',       NULL, NULL),
(7,  5,  '2026-10-22', 'virtual',      'https://zoom.us/j/123456789', 'Sesión en línea por falla de red en el aula'),
(8,  6,  '2026-10-23', 'reprogramada', NULL, 'Se recorre al lunes 26 a las 16:00'),
(9,  7,  '2026-10-20', 'normal',       NULL, NULL),
(10, 8,  '2026-10-21', 'cancelada',    NULL, 'Docente con incapacidad médica'),
(11, 9,  '2026-10-22', 'normal',       NULL, NULL),
(12, 10, '2026-10-23', 'virtual',      'https://meet.google.com/xyz-uvwx-rst', 'Clase en línea por evento en el edificio'),
(13, 11, '2026-10-26', 'normal',       NULL, NULL),
(14, 12, '2026-10-22', 'reprogramada', NULL, 'Cambio de laboratorio por práctica especial'),
(15, 13, '2026-10-21', 'normal',       NULL, NULL);

-- EVENTO_COMUNITARIO (12)
INSERT INTO evento_comunitario (id_evento, titulo, descripcion, fecha_evento, hora_inicio, hora_fin, estado_evento, id_proponente, id_aprobador, id_espacio) VALUES
(1,  'Feria de Ciencias',            'Exposición de proyectos estudiantiles de todas las carreras', '2026-11-15', '10:00:00', '14:00:00', 'aprobado',  3,  1,    10),
(2,  'Torneo de Ajedrez',            'Torneo interno abierto a toda la comunidad universitaria',    '2026-11-05', '09:00:00', '15:00:00', 'aprobado',  7,  1,    11),
(3,  'Conferencia de Ciberseguridad','Charla con expertos de la industria',                         '2026-11-10', '16:00:00', '18:00:00', 'aprobado',  5,  2,    12),
(4,  'Taller de Programación',       'Introducción a Python para principiantes',                    '2026-11-12', '12:00:00', '15:00:00', 'pendiente', 8,  NULL, 8),
(5,  'Cine-debate',                  'Proyección y discusión de documental',                        '2026-11-18', '17:00:00', '20:00:00', 'pendiente', 9,  NULL, 11),
(6,  'Noche de Talentos',            'Presentaciones artísticas y musicales de alumnos',            '2026-11-20', '18:00:00', '21:00:00', 'aprobado',  10, 2,    10),
(7,  'Campaña de Donación de Sangre','En colaboración con la Cruz Roja',                            '2026-11-08', '09:00:00', '13:00:00', 'aprobado',  4,  1,    11),
(8,  'Hackathon Universitario',      'Competencia de desarrollo de 24 horas',                       '2026-12-02', '09:00:00', '21:00:00', 'pendiente', 6,  NULL, 9),
(9,  'Concurso de Robótica',         'Competencia de robots autónomos',                             '2026-12-05', '10:00:00', '16:00:00', 'rechazado', 11, 2,    7),
(10, 'Posada Universitaria',         'Convivio de fin de semestre',                                 '2026-12-12', '17:00:00', '22:00:00', 'pendiente', 13, NULL, 12),
(11, 'Mesa Redonda de Egresados',    'Experiencias laborales de egresados',                         '2026-11-25', '11:00:00', '13:00:00', 'cancelado', 12, 1,    3),
(12, 'Jornada de Bienvenida',        'Actividades de integración para alumnos de nuevo ingreso',    '2026-11-03', '09:00:00', '13:00:00', 'aprobado',  3,  1,    10);
