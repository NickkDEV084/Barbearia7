from sqlalchemy.orm import Session, joinedload
from app.models.client import Client
from app.services import client_service


def list_clients(db):
    result = []
    clients = db.query(Client).options(joinedload(Client.appointments)).order_by(Client.name).all()
    for client in clients:
        visits = [item for item in client.appointments if item.status != "cancelled"]
        completed_visits = [item for item in visits if item.status == "completed"]
        result.append({
            "id": client.id, "name": client.name, "phone": client.phone,
            "appointment_count": len(visits),
            "last_visit": max((item.date.isoformat() for item in completed_visits), default=None),
        })
    return result


def get_client(db, client_id):
    client = client_service.get_client_by_id(db, client_id)
    return {"id": client.id, "name": client.name, "phone": client.phone,
            "appointments": client_service.get_client_history(db, client_id)}
