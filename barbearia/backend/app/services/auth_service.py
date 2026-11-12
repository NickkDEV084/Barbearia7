import hashlib
import hmac
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.admin import Admin


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, salt, expected = stored.split("$", 2)
        if scheme != "pbkdf2_sha256":
            return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 180_000).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def login(db: Session, username: str, password: str):
    admin = db.query(Admin).filter(Admin.username == username).first()
    if not admin or not verify_password(password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    token = jwt.encode({"sub": admin.username, "exp": expires}, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return {"access_token": token, "token_type": "bearer", "username": admin.username}


def authenticate_token(db: Session, token: str):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        username = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão expirada. Entre novamente.", headers={"WWW-Authenticate": "Bearer"})
    admin = db.query(Admin).filter(Admin.username == username).first()
    if not admin:
        raise HTTPException(status_code=401, detail="Administrador não encontrado", headers={"WWW-Authenticate": "Bearer"})
    return admin
