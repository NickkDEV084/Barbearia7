from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.service import Service


def get_all_services(db: Session, active_only: bool = True):
    query = db.query(Service)
    if active_only:
        query = query.filter(Service.active == True)
    return query.order_by(Service.name).all()


def get_service_by_id(db: Session, service_id: int):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    return service


def create_service(db: Session, data: dict):
    service = Service(
        name=data["name"],
        price=data["price"],
        duration_minutes=data["duration_minutes"],
        active=data.get("active", True),
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


def update_service(db: Session, service_id: int, data: dict):
    service = get_service_by_id(db, service_id)
    for key, value in data.items():
        if hasattr(service, key) and value is not None:
            setattr(service, key, value)
    db.commit()
    db.refresh(service)
    return service


def delete_service(db: Session, service_id: int):
    service = get_service_by_id(db, service_id)
    service.active = False
    db.commit()
    return {"message": "Serviço desativado com sucesso"}
