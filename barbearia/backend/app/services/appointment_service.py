from datetime import date, datetime, time

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload

from app.models.appointment import Appointment
from app.models.barber import Barber
from app.models.schedule import DayOff, ScheduleConfig
from app.models.service import Service
from app.services.client_service import get_or_create_client

BOOKING_STATUSES = ("pending", "confirmed", "rescheduled", "completed")


def _minutes(value: time) -> int:
    return value.hour * 60 + value.minute


def _as_date(value) -> date:
    return value if isinstance(value, date) else date.fromisoformat(value)


def _as_time(value) -> time:
    return value if isinstance(value, time) else time.fromisoformat(value)


def _get_schedule(db: Session, barber_id: int, target_date: date):
    day_off = db.query(DayOff).filter(
        DayOff.date == target_date,
        (DayOff.barber_id == barber_id) | (DayOff.barber_id.is_(None)),
    ).first()
    if day_off:
        return None

    schedule = db.query(ScheduleConfig).filter(
        ScheduleConfig.barber_id == barber_id,
        ScheduleConfig.day_of_week == target_date.weekday(),
        ScheduleConfig.is_active.is_(True),
    ).first()
    if schedule:
        return schedule
    return db.query(ScheduleConfig).filter(
        ScheduleConfig.barber_id.is_(None),
        ScheduleConfig.day_of_week == target_date.weekday(),
        ScheduleConfig.is_active.is_(True),
    ).first()


def _validate_slot(db: Session, barber_id: int, target_date: date, start: time, duration: int):
    if start.second or start.microsecond:
        raise HTTPException(status_code=400, detail="Escolha um horário em minutos inteiros")
    if target_date < date.today():
        raise HTTPException(status_code=400, detail="Não é possível agendar em uma data passada")
    if target_date == date.today() and _minutes(start) <= datetime.now().hour * 60 + datetime.now().minute:
        raise HTTPException(status_code=400, detail="Não é possível agendar em um horário passado")

    schedule = _get_schedule(db, barber_id, target_date)
    if not schedule:
        raise HTTPException(status_code=400, detail="O profissional não atende nesta data")

    start_m, end_m = _minutes(start), _minutes(start) + duration
    schedule_start = _minutes(schedule.start_time)
    if start_m < schedule_start or end_m > _minutes(schedule.end_time):
        raise HTTPException(status_code=400, detail="Horário fora do expediente")
    if (start_m - schedule_start) % 30:
        raise HTTPException(status_code=400, detail="Escolha um horário disponível da agenda")
    if schedule.break_start and schedule.break_end:
        if start_m < _minutes(schedule.break_end) and end_m > _minutes(schedule.break_start):
            raise HTTPException(status_code=400, detail="Horário durante o intervalo")
    return end_m


def get_available_slots(db: Session, barber_id: int, target_date: date, service_id: int):
    barber = db.query(Barber).filter(Barber.id == barber_id, Barber.active.is_(True)).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barbeiro não encontrado")
    service = db.query(Service).filter(Service.id == service_id, Service.active.is_(True)).first()
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    if target_date < date.today():
        return []

    schedule = _get_schedule(db, barber_id, target_date)
    if not schedule:
        return []

    existing = db.query(Appointment).filter(
        Appointment.barber_id == barber_id,
        Appointment.date == target_date,
        Appointment.status.in_(BOOKING_STATUSES),
    ).all()
    occupied = [(_minutes(item.start_time), _minutes(item.end_time)) for item in existing]

    available = []
    start_m = _minutes(schedule.start_time)
    end_m = _minutes(schedule.end_time)
    while start_m + service.duration_minutes <= end_m:
        slot_end = start_m + service.duration_minutes
        in_break = (
            schedule.break_start is not None
            and schedule.break_end is not None
            and start_m < _minutes(schedule.break_end)
            and slot_end > _minutes(schedule.break_start)
        )
        is_past = target_date == date.today() and start_m <= datetime.now().hour * 60 + datetime.now().minute
        overlaps = any(start_m < occupied_end and slot_end > occupied_start for occupied_start, occupied_end in occupied)
        if not in_break and not is_past and not overlaps:
            available.append(time(start_m // 60, start_m % 60).strftime("%H:%M"))
        start_m += 30
    return available


def create_appointment(db: Session, data: dict):
    # Serialize SQLite writers before checking availability to close the double-booking race.
    if db.get_bind().dialect.name == "sqlite" and not db.in_transaction():
        db.execute(text("BEGIN IMMEDIATE"))
    try:
        target_date = _as_date(data["date"])
        start_time = _as_time(data["start_time"])
        barber = db.query(Barber).filter(Barber.id == data["barber_id"], Barber.active.is_(True)).first()
        service = db.query(Service).filter(Service.id == data["service_id"], Service.active.is_(True)).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barbeiro não encontrado")
        if not service:
            raise HTTPException(status_code=404, detail="Serviço não encontrado")

        end_m = _validate_slot(db, barber.id, target_date, start_time, service.duration_minutes)
        start_m = _minutes(start_time)
        conflicts = db.query(Appointment).filter(
            Appointment.barber_id == barber.id,
            Appointment.date == target_date,
            Appointment.status.in_(BOOKING_STATUSES),
        ).all()
        if any(start_m < _minutes(item.end_time) and end_m > _minutes(item.start_time) for item in conflicts):
            raise HTTPException(status_code=409, detail="Esse horário acabou de ser reservado. Escolha outro.")

        client = get_or_create_client(db, data["client_name"].strip(), data["client_phone"].strip())
        appointment = Appointment(
            client_id=client.id,
            barber_id=barber.id,
            service_id=service.id,
            date=target_date,
            start_time=start_time,
            end_time=time(end_m // 60, end_m % 60),
            status="pending",
            notes=data.get("notes"),
        )
        db.add(appointment)
        db.commit()
        return get_appointment_by_id(db, appointment.id)
    except Exception:
        db.rollback()
        raise


def get_appointments(db: Session, target_date: date = None, barber_id: int = None, status: str = None,
                     date_from: date = None, date_to: date = None):
    query = db.query(Appointment).options(
        joinedload(Appointment.client), joinedload(Appointment.barber), joinedload(Appointment.service)
    )
    if target_date:
        query = query.filter(Appointment.date == target_date)
    if date_from:
        query = query.filter(Appointment.date >= date_from)
    if date_to:
        query = query.filter(Appointment.date <= date_to)
    if barber_id:
        query = query.filter(Appointment.barber_id == barber_id)
    if status:
        query = query.filter(Appointment.status == status)
    return query.order_by(Appointment.date, Appointment.start_time).all()


def get_appointment_by_id(db: Session, appointment_id: int):
    appointment = db.query(Appointment).options(
        joinedload(Appointment.client), joinedload(Appointment.barber), joinedload(Appointment.service)
    ).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    return appointment


def update_appointment_status(db: Session, appointment_id: int, new_status: str):
    if new_status not in ("pending", "confirmed", "completed", "cancelled", "rescheduled"):
        raise HTTPException(status_code=400, detail="Status de agendamento inválido")
    appointment = get_appointment_by_id(db, appointment_id)
    appointment.status = new_status
    db.commit()
    return get_appointment_by_id(db, appointment_id)


def reschedule_appointment(db: Session, appointment_id: int, new_date, new_start_time):
    if db.get_bind().dialect.name == "sqlite":
        # The admin token check may already have opened a read transaction on this session.
        if db.in_transaction():
            db.rollback()
        db.execute(text("BEGIN IMMEDIATE"))
    try:
        appointment = get_appointment_by_id(db, appointment_id)
        target_date, start_time = _as_date(new_date), _as_time(new_start_time)
        service = db.query(Service).filter(Service.id == appointment.service_id).first()
        if not service:
            raise HTTPException(status_code=404, detail="Serviço não encontrado")
        end_m = _validate_slot(db, appointment.barber_id, target_date, start_time, service.duration_minutes)
        start_m = _minutes(start_time)
        conflicts = db.query(Appointment).filter(
            Appointment.barber_id == appointment.barber_id,
            Appointment.date == target_date,
            Appointment.status.in_(BOOKING_STATUSES),
            Appointment.id != appointment_id,
        ).all()
        if any(start_m < _minutes(item.end_time) and end_m > _minutes(item.start_time) for item in conflicts):
            raise HTTPException(status_code=409, detail="Esse horário já está ocupado")
        appointment.date = target_date
        appointment.start_time = start_time
        appointment.end_time = time(end_m // 60, end_m % 60)
        appointment.status = "rescheduled"
        db.commit()
        return get_appointment_by_id(db, appointment_id)
    except Exception:
        db.rollback()
        raise
