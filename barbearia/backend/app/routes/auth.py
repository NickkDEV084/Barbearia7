from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers.auth_controller import sign_in
from app.database import get_db
from app.routes.dependencies import get_current_admin
from app.schemas import LoginInput

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])


@router.post("/login")
def login(payload: LoginInput, db: Session = Depends(get_db)):
    return sign_in(db, payload.username, payload.password)


@router.get("/me")
def current_admin(admin=Depends(get_current_admin)):
    return {"username": admin.username}
