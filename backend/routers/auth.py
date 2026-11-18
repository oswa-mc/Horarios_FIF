from fastapi import APIRouter, HTTPException, status, Depends

try:
    from database import query_one
    from schemas import LoginRequest, LoginResponse, UserInfo
    from auth import verify_password, create_access_token, get_current_user
except ImportError:
    from backend.database import query_one
    from backend.schemas import LoginRequest, LoginResponse, UserInfo
    from backend.auth import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Autenticacion"])

@router.post("/login", response_model=LoginResponse)
def login(credentials: LoginRequest):
    sql = "SELECT id_usuario, expediente, nombre, correo, contrasena, rol FROM usuario WHERE expediente = %s"
    user = query_one(sql, (credentials.expediente.strip(),))
    
    if not user or not verify_password(credentials.contrasena, user["contrasena"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expediente o contraseña incorrectos"
        )
    
    token_data = {
        "id_usuario": user["id_usuario"],
        "expediente": user["expediente"],
        "nombre": user["nombre"],
        "rol": user["rol"]
    }
    
    token = create_access_token(token_data)
    
    return {
        "token": token,
        "usuario": {
            "id_usuario": user["id_usuario"],
            "nombre": user["nombre"],
            "rol": user["rol"],
            "expediente": user["expediente"],
            "correo": user["correo"]
        }
    }

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    user = query_one(
        "SELECT id_usuario, expediente, nombre, correo, rol FROM usuario WHERE id_usuario = %s",
        (current_user["id_usuario"],)
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user

