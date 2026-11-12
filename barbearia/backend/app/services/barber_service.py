from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.barber import Barber


def get_all_barbers(db: Session, active_only: bool = True):
    query = db.query(Barber)
    if active_only:
        query = query.filter(Barber.active == True)
    return query.order_by(Barber.name).all()


def get_barber_by_id(db: Session, barber_id: int):
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barbeiro não encontrado")
    return barber


def create_barber(db: Session, data: dict):
    barber = Barber(
        name=data["name"],
        phone=data.get("phone"),
        photo_url=data.get("photo_url"),
        active=data.get("active", True),
    )
    db.add(barber)
    db.commit()
    db.refresh(barber)
    return barber


def update_barber(db: Session, barber_id: int, data: dict):
    barber = get_barber_by_id(db, barber_id)
    for key, value in data.items():
        if hasattr(barber, key) and value is not None:
            setattr(barber, key, value)
    db.commit()
    db.refresh(barber)
    return barber
