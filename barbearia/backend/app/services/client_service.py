from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from fastapi import HTTPException
from app.models.client import Client
from app.models.appointment import Appointment


def _normalize_phone(phone: str) -> str:
    digits = "".join(character for character in phone if character.isdigit())
    if len(digits) in (12, 13) and digits.startswith("55"):
        digits = digits[2:]
    return digits


def get_all_clients(db: Session):
    clients = db.query(
        Client,
        func.count(Appointment.id).label("appointment_count")
    ).outerjoin(
        Appointment, Client.id == Appointment.client_id
    ).group_by(Client.id).order_by(Client.name).all()

    result = []
    for client, count in clients:
        result.append({
            "id": client.id,
            "name": client.name,
            "phone": client.phone,
            "created_at": client.created_at.isoformat() if client.created_at else None,
            "appointment_count": count,
        })
    return result


def get_client_by_id(db: Session, client_id: int):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return client


def get_client_by_phone(db: Session, phone: str):
    digits = _normalize_phone(phone)
    return db.query(Client).filter(Client.phone == digits).first()


def get_or_create_client(db: Session, name: str, phone: str):
    digits = _normalize_phone(phone)
    client = get_client_by_phone(db, digits)
    if client:
        client.name = name
        return client
    client = Client(name=name, phone=digits)
    db.add(client)
    db.flush()
    return client


def get_client_history(db: Session, client_id: int):
    client = get_client_by_id(db, client_id)
    appointments = db.query(Appointment).options(
        joinedload(Appointment.barber), joinedload(Appointment.service)
    ).filter(
        Appointment.client_id == client_id
    ).order_by(Appointment.date.desc(), Appointment.start_time.desc()).all()

    result = []
    for appt in appointments:
        result.append({
            "id": appt.id,
            "date": appt.date.isoformat(),
            "start_time": appt.start_time.strftime("%H:%M"),
            "end_time": appt.end_time.strftime("%H:%M"),
            "status": appt.status,
            "notes": appt.notes,
            "barber": {"id": appt.barber.id, "name": appt.barber.name},
            "service": {
                "id": appt.service.id,
                "name": appt.service.name,
                "price": appt.service.price,
            },
        })
    return result
