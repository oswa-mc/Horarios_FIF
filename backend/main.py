import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
root_dir = backend_dir.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from routers import auth, alumno, docente, admin, eventos, espacios, catalogos
except ImportError:
    from backend.routers import auth, alumno, docente, admin, eventos, espacios, catalogos

app = FastAPI(
    title="Sistema Web de Gestion de Horarios y Recursos Academicos (FIF-UAQ)",
    description="API REST para centralizacion de horarios escolares, estados de clases en tiempo real y reserva de espacios para eventos comunitarios.",
    version="1.0.0"
)

# Configuracion de CORS para permitir peticiones desde http://localhost:5173
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion de routers
app.include_router(auth.router)
app.include_router(alumno.router)
app.include_router(docente.router)
app.include_router(admin.router)
app.include_router(eventos.router)
app.include_router(espacios.router)
app.include_router(catalogos.router)

@app.get("/")
def root():
    return {
        "sistema": "Gestion de Horarios y Recursos Academicos FIF-UAQ",
        "version": "1.0.0",
        "estado": "Activo",
        "docs": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Horarios-FIF-API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

