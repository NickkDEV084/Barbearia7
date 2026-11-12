from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import catalog_controller
from app.database import get_db
from app.routes.dependencies import get_current_admin
from app.schemas import ServiceInput

router = APIRouter(prefix="/api", tags=["Catálogo"])


@router.get("/services")
def public_services(db: Session = Depends(get_db)):
    return catalog_controller.list_services(db)


@router.get("/barbers")
def public_barbers(db: Session = Depends(get_db)):
    return catalog_controller.list_barbers(db)


@router.get("/admin/services")
def admin_services(db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return catalog_controller.list_admin_services(db)


@router.post("/admin/services")
def create_service(payload: ServiceInput, db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return catalog_controller.create_service(db, payload.dict())


@router.put("/admin/services/{service_id}")
def update_service(service_id: int, payload: ServiceInput, db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return catalog_controller.update_service(db, service_id, payload.dict())


@router.delete("/admin/services/{service_id}")
def delete_service(service_id: int, db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return catalog_controller.delete_service(db, service_id)
