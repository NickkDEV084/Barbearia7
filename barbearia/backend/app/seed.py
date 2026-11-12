import hashlib
import secrets
from datetime import date, datetime, time, timedelta

from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models import Admin, Appointment, Barber, Client, ScheduleConfig, Service


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 180_000).hex()
    return f"pbkdf2_sha256${salt}${digest}"


def seed_data(db: Session):
    if db.query(Barber).first():
        return

    barbers = [
        Barber(name="Gama", phone="11999990001", photo_url="/assets/barber-placeholder.svg", active=True),
        Barber(name="Lucas", phone="11999990002", photo_url="/assets/barber-placeholder.svg", active=True),
    ]
    services = [
        Service(name="Corte", price=45, duration_minutes=30),
        Service(name="Barba", price=35, duration_minutes=30),
        Service(name="Corte + barba", price=70, duration_minutes=50),
        Service(name="Sobrancelha", price=20, duration_minutes=15),
        Service(name="Acabamento", price=25, duration_minutes=20),
        Service(name="Hidratação", price=50, duration_minutes=40),
    ]
    db.add_all(barbers + services)
    db.flush()

    for barber in barbers:
        for weekday in range(6):
            db.add(ScheduleConfig(
                barber_id=barber.id,
                day_of_week=weekday,
                start_time=time(9, 0),
                end_time=time(19, 0) if weekday < 5 else time(17, 0),
                break_start=time(12, 0),
                break_end=time(13, 0),
                is_active=True,
            ))
        db.add(ScheduleConfig(barber_id=barber.id, day_of_week=6, start_time=time(9), end_time=time(17), is_active=False))

    db.add(Admin(username=settings.ADMIN_USERNAME, password_hash=hash_password(settings.ADMIN_PASSWORD)))

    clients = [
        Client(name="João Silva", phone="11988881001"),
        Client(name="Pedro Oliveira", phone="11988881002"),
        Client(name="Carlos Santos", phone="11988881003"),
        Client(name="Rafael Costa", phone="11988881004"),
        Client(name="Marcos Pereira", phone="11988881005"),
    ]
    db.add_all(clients)
    db.flush()

    today = date.today()
    demo_appointments = [
        Appointment(client_id=clients[0].id, barber_id=barbers[0].id, service_id=services[0].id,
                    date=today - timedelta(days=7), start_time=time(10), end_time=time(10, 30), status="completed"),
        Appointment(client_id=clients[1].id, barber_id=barbers[0].id, service_id=services[2].id,
                    date=today - timedelta(days=5), start_time=time(14), end_time=time(14, 50), status="completed"),
        Appointment(client_id=clients[2].id, barber_id=barbers[1].id, service_id=services[1].id,
                    date=today - timedelta(days=3), start_time=time(11), end_time=time(11, 30), status="completed"),
        Appointment(client_id=clients[3].id, barber_id=barbers[1].id, service_id=services[0].id,
                    date=today - timedelta(days=2), start_time=time(9), end_time=time(9, 30), status="completed"),
        Appointment(client_id=clients[4].id, barber_id=barbers[0].id, service_id=services[5].id,
                    date=today - timedelta(days=1), start_time=time(16), end_time=time(16, 40), status="completed"),
        Appointment(client_id=clients[0].id, barber_id=barbers[0].id, service_id=services[0].id,
                    date=today, start_time=time(15), end_time=time(15, 30), status="confirmed"),
        Appointment(client_id=clients[1].id, barber_id=barbers[1].id, service_id=services[2].id,
                    date=today, start_time=time(16), end_time=time(16, 50), status="pending"),
    ]
    db.add_all(demo_appointments)
    db.commit()
