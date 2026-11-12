from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers.dashboard_controller import dashboard_data
from app.database import get_db
from app.routes.dependencies import get_current_admin

router = APIRouter(prefix="/api/admin/dashboard", tags=["Painel"])


@router.get("")
def dashboard(db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return dashboard_data(db)
