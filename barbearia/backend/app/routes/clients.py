from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import client_controller
from app.database import get_db
from app.routes.dependencies import get_current_admin

router = APIRouter(prefix="/api/admin/clients", tags=["Clientes"])


@router.get("")
def list_clients(db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return client_controller.list_clients(db)


@router.get("/{client_id}")
def get_client(client_id: int, db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return client_controller.get_client(db, client_id)
