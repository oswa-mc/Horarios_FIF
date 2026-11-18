# Sistema Web de Gestion de Horarios y Recursos Academicos (FIF-UAQ)

Sistema web cliente-servidor estructurado en tres capas (Presentacion, Logica de Negocio y Datos) para la Facultad de Informatica de la Universidad Autonoma de Queretaro (**FIF-UAQ**).

Centraliza la gestion de horarios escolares, la actualizacion en tiempo real del estado de clases (presencial, virtual con enlace, cancelada, reprogramada) y la tramitacion y aprobacion de espacios para eventos comunitarios con prevencion estricta de empalmes.

---

## 🛠️ Stack Tecnologico

- **Frontend:** React + Vite + CSS institucional (Azul `#2563EB`, fondo `#F4F6FB`, tarjetas redondeadas, tipografia *Inter*).
- **Backend:** Python + FastAPI + PyJWT + Passlib/Bcrypt (CORS habilitado para `http://localhost:5173`).
- **Base de Datos:** MySQL / MariaDB (XAMPP) con esquema `gestion_academica`.

---

## 📁 Estructura del Proyecto

```text
Horarios_FIF/
├── backend/
│   ├── database/
│   │   └── gestion_academica.sql   # Script SQL con esquema y datos semilla
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── admin.py                # Modulo 3: Programacion y deteccion de empalmes
│   │   ├── alumno.py               # Modulo 2: Horario y carga academica del estudiante
│   │   ├── auth.py                 # Modulo 1: Login JWT y perfil
│   │   ├── catalogos.py            # Catalogos de materias y docentes
│   │   ├── docente.py              # Modulo 4: Clases asignadas y cambio de estado
│   │   ├── espacios.py             # Consulta de 12 espacios y disponibilidad
│   │   └── eventos.py              # Modulo 5: Solicitudes y aprobaciones de eventos comunitarios
│   ├── auth.py                     # Generacion y verificacion de tokens JWT y contraseñas
│   ├── database.py                 # Conexion PyMySQL a XAMPP
│   ├── main.py                     # Entrada de FastAPI con CORS configurado
│   ├── requirements.txt            # Dependencias de Python
│   ├── schemas.py                  # Modelos y validaciones Pydantic
│   └── .env.example                # Variables de entorno de referencia
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ModalEspaciosDisponibles.jsx  # Selector de espacios alternativos libres
│   │   │   ├── ModalEvento.jsx               # Formulario validado para proponer eventos
│   │   │   └── Navbar.jsx                    # Barra de navegacion institucional
│   │   ├── pages/
│   │   │   ├── AdminView.jsx                 # Panel administrativo (empalmes y espacios)
│   │   │   ├── AlumnoView.jsx                # Panel estudiante (parrilla semanal y polling 3s)
│   │   │   ├── DocenteView.jsx               # Panel docente (actualizacion de estados y links)
│   │   │   └── Login.jsx                     # Inicio de sesion con accesos rapidos
│   │   ├── api.js                            # Cliente Fetch con interceptor de token JWT
│   │   ├── App.jsx                           # Enrutador principal segun rol (/alumno, /docente, /admin)
│   │   ├── index.css                         # Estilos y diseño visual institucional UAQ
│   │   └── main.jsx                          # Punto de entrada de React
│   ├── index.html                            # HTML base con fuente Inter
│   ├── package.json                          # Dependencias y scripts de Node.js
│   └── vite.config.js                        # Configuracion de Vite (puerto 5173)
├── base_datos_academica_v2.sql               # Respaldo raiz del script SQL
├── instrucciones.pdf                         # Especificacion tecnica oficial
├── MANUAL_DE_USUARIO.md                      # Manual integral de usuario por perfiles
├── README.md                                 # Guia de puesta en marcha
├── instalar.bat                              # Ejecutable de instalacion de dependencias
├── iniciar_sistema.bat                       # Ejecutable para arrancar frontend y backend
└── importar_bd.bat                           # Ejecutable para importar base de datos en XAMPP
```

---

## ⚡ Instalacion y Arranque Rapido con Ejecutables (.bat)

Para simplificar todo el proceso en Windows, dispones de scripts ejecutables listos para usar con doble clic:

| Archivo | Funcion |
| :--- | :--- |
| **[`instalar.bat`](file:///d:/GitHub/Horarios_FIF/Horarios_FIF/instalar.bat)** | **Instalador automatico:** Verifica Python y Node.js, crea el entorno virtual, instala dependencias del Backend (`pip`), instala paquetes del Frontend (`npm install`) e importa la BD si MySQL esta activo. |
| **[`iniciar_sistema.bat`](file:///d:/GitHub/Horarios_FIF/Horarios_FIF/iniciar_sistema.bat)** | **Lanzador todo en uno:** Arranca el servidor Backend (puerto 8000), el Frontend React (puerto 5173) y abre el navegador automaticamente en `http://localhost:5173`. |
| **[`importar_bd.bat`](file:///d:/GitHub/Horarios_FIF/Horarios_FIF/importar_bd.bat)** | **Importador de Base de Datos:** Carga o restablece el esquema y datos semilla de `gestion_academica` en MySQL XAMPP con un solo clic. |

---

## 🚀 Guia de Puesta en Marcha Paso a Paso (Manual)

### Paso 1: Configurar la Base de Datos en XAMPP

1. Abre el **Panel de Control de XAMPP**.
2. Inicia los modulos **Apache** y **MySQL** presionando **Start** en ambos.
3. Abre tu navegador web y entra a **phpMyAdmin**: [http://localhost:8080/phpmyadmin](http://localhost:8080/phpmyadmin) (o [http://localhost/phpmyadmin](http://localhost/phpmyadmin) si Apache esta en el puerto 80).
4. Haz clic en la pestaña superior **Importar** (*Import*).
5. Selecciona el archivo SQL ubicado en:
   ```text
   backend/database/gestion_academica.sql
   ```
6. Haz clic en el boton **Continuar** (*Import*).
   > Esto creara la base de datos `gestion_academica` con las 7 tablas relacionales y todos los datos semilla de prueba (15 usuarios, 12 materias, 12 espacios, 15 clases, estados y eventos).

---

### Paso 2: Iniciar el Backend (FastAPI)

1. Abre una terminal (PowerShell o CMD) y entra a la carpeta `backend`:
   ```bash
   cd backend
   ```
2. *(Opcional)* Crea y activa un entorno virtual de Python:
   ```bash
   python -m venv venv
   # En Windows:
   venv\Scripts\activate
   ```
3. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
4. Arranca el servidor FastAPI con recarga automatica:
   ```bash
   uvicorn main:app --reload
   ```
5. El backend estara activo en `http://localhost:8000`.
   - Puedes consultar la documentacion interactiva en Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs).

---

### Paso 3: Iniciar el Frontend (React + Vite)

1. Abre una segunda terminal y navega a la carpeta `frontend`:
   ```bash
   cd frontend
   ```
2. Instala los paquetes de Node.js:
   ```bash
   npm install
   ```
3. Ejecuta el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Abre tu navegador en la URL indicada por Vite (normalmente [http://localhost:5173](http://localhost:5173)).

---

## 📚 Documentacion y Manual de Usuario

Para conocer en detalle el funcionamiento del sistema, guias paso a paso para cada rol e imagenes ilustrativas de los flujos de trabajo, consulta el archivo:
👉 **[MANUAL_DE_USUARIO.md](file:///d:/GitHub/Horarios_FIF/Horarios_FIF/MANUAL_DE_USUARIO.md)**

---

## 🔑 Credenciales de Acceso para Pruebas

Todas las cuentas de prueba tienen la misma contraseña predeterminada: `prueba123`.

| Rol | Expediente | Nombre de Usuario | Funcionalidades Principales |
| :--- | :--- | :--- | :--- |
| **Alumno** | `2024001` | Maria Lopez Garcia | Parrilla semanal Lunes a Sabado, banner de proxima clase, boton para unirse a videollamadas, sincronizacion en vivo cada 3s, pestaña de solicitudes y boton `+ Proponer evento`. |
| **Docente** | `DOC001` | Juan Perez Hernandez | Resumen de clases y alumnos, selector de estado de clase (normal, virtual, cancelada, reprogramada), campo de enlace a videollamada resaltado, observaciones y confirmacion de guardado. |
| **Administrador** | `ADM001` | Laura Ramirez Soto | Programacion general con validacion anti-empalmes (error 409 con detalle), aprobacion de eventos con alerta preventiva y boton "Ver espacios disponibles", visualizacion de espacios y barras de ocupacion. |

*(Nota: En la pantalla de inicio de sesion se incluyen botones de acceso rapido para probar cualquiera de los tres roles con un solo clic).*

---

## 🛡️ Reglas de Negocio Implementadas

1. **Prevencion de Empalmes (Modulo 3):**
   - Al intentar registrar una clase, el sistema valida que no exista empalme de aula ni de docente en el mismo dia y periodo, y que no colisione con ningun evento comunitario aprobado. En caso de traslape, retorna `409 Conflict` con el mensaje explicito del conflicto.
2. **Actualizacion en Tiempo Real (RNF2):**
   - El panel del estudiante realiza sondeo periodico (polling) cada 3 segundos contra el backend para reflejar cualquier cambio de estado (virtual, enlace de Google Meet/Zoom, cancelaciones o reprogramaciones) de manera inmediata.
3. **Gestion de Eventos y Verificacion Preventiva (Modulo 5):**
   - Toda solicitud de evento comunitario muestra preventivamente si tiene choque de horario, desplegando la etiqueta *"Empalme detectado"* y el boton *"Ver espacios disponibles"* para consultar alternativas libres en esa fecha y horario.

