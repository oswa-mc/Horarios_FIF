from pydantic import BaseModel, HttpUrl, field_validator, model_validator
from typing import Optional, List
import re

class LoginRequest(BaseModel):
    expediente: str
    contrasena: str

class UserInfo(BaseModel):
    id_usuario: int
    nombre: str
    rol: str
    expediente: str
    correo: Optional[str] = None

class LoginResponse(BaseModel):
    token: str
    usuario: UserInfo

class ClaseCreate(BaseModel):
    id_materia: int
    id_docente: int
    id_espacio: int
    dia_semana: str
    hora_inicio: str
    hora_fin: str
    periodo_lectivo: str = "2026-2"

    @field_validator("dia_semana")
    def validate_dia(cls, v):
        valid = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
        v_clean = v.strip().lower()
        if v_clean not in valid:
            raise ValueError(f"Dia de la semana invalido. Debe ser uno de: {valid}")
        return v_clean

class EstadoClaseUpdate(BaseModel):
    fecha: str
    estado: str
    enlace_virtual: Optional[str] = None
    observaciones: Optional[str] = None

    @field_validator("estado")
    def validate_estado(cls, v):
        valid = ['normal', 'virtual', 'cancelada', 'reprogramada']
        v_clean = v.strip().lower()
        if v_clean not in valid:
            raise ValueError(f"Estado invalido. Debe ser uno de: {valid}")
        return v_clean

    @field_validator("enlace_virtual")
    def validate_enlace(cls, v, info):
        estado = info.data.get("estado")
        if estado == "virtual":
            if not v or not re.match(r"^https?://[^\s]+$", v.strip()):
                raise ValueError("Para clases virtuales se requiere un enlace web valido que inicie con http:// o https://")
        return v

class EventoCreate(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    fecha_evento: str
    hora_inicio: str
    hora_fin: str
    id_espacio: int

    @model_validator(mode="after")
    def validate_duracion(self):
        try:
            h_ini, m_ini = map(int, self.hora_inicio[:5].split(':'))
            h_fin, m_fin = map(int, self.hora_fin[:5].split(':'))
            duracion = (h_fin * 60 + m_fin) - (h_ini * 60 + m_ini)
            if duracion < 30:
                raise ValueError("El evento debe tener una duracion minima de 30 minutos.")
        except ValueError as e:
            raise e
        except Exception:
            pass
        return self

class EventoStatusUpdate(BaseModel):
    estado_evento: str

    @field_validator("estado_evento")
    def validate_estado_evento(cls, v):
        valid = ['aprobado', 'rechazado', 'cancelado', 'pendiente']
        v_clean = v.strip().lower()
        if v_clean not in valid:
            raise ValueError(f"Estado de evento invalido. Debe ser uno de: {valid}")
        return v_clean

