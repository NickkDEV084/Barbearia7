from datetime import date, time

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.schedule import DayOff, ScheduleConfig
from app.models.barber import Barber


def get_schedule_config(db: Session):
    return db.query(ScheduleConfig).order_by(ScheduleConfig.barber_id, ScheduleConfig.day_of_week).all()


def update_schedule_config(db: Session, configs: list):
    for item in configs:
        if item.get("barber_id") is not None and not db.query(Barber.id).filter(Barber.id == item["barber_id"]).first():
            raise HTTPException(status_code=404, detail="Profissional não encontrado")
        start = item["start_time"] if isinstance(item["start_time"], time) else time.fromisoformat(item["start_time"])
        end = item["end_time"] if isinstance(item["end_time"], time) else time.fromisoformat(item["end_time"])
        break_start = item.get("break_start")
        break_end = item.get("break_end")
        if isinstance(break_start, str) and break_start:
            break_start = time.fromisoformat(break_start)
        if isinstance(break_end, str) and break_end:
            break_end = time.fromisoformat(break_end)
        if item.get("is_active", True) and start >= end:
            raise HTTPException(status_code=422, detail="O fim do expediente deve ser depois do início")
        if bool(break_start) != bool(break_end):
            raise HTTPException(status_code=422, detail="Informe início e fim do intervalo")
        if break_start and not (start < break_start < break_end < end):
            raise HTTPException(status_code=422, detail="O intervalo deve ficar dentro do expediente")

        existing = db.query(ScheduleConfig).filter(
            ScheduleConfig.barber_id == item.get("barber_id"),
            ScheduleConfig.day_of_week == item["day_of_week"],
        ).first()
        values = {
            "start_time": start, "end_time": end,
            "break_start": break_start, "break_end": break_end,
            "is_active": item.get("is_active", True),
        }
        if existing:
            for key, value in values.items():
                setattr(existing, key, value)
        else:
            db.add(ScheduleConfig(barber_id=item.get("barber_id"), day_of_week=item["day_of_week"], **values))
    db.commit()
    return get_schedule_config(db)


def get_days_off(db: Session):
    return db.query(DayOff).order_by(DayOff.date).all()


def add_day_off(db: Session, data: dict):
    target_date = data["date"] if isinstance(data["date"], date) else date.fromisoformat(data["date"])
    if data.get("barber_id") is not None and not db.query(Barber.id).filter(Barber.id == data["barber_id"]).first():
        raise HTTPException(status_code=404, detail="Profissional não encontrado")
    query = db.query(DayOff).filter(DayOff.date == target_date)
    if data.get("barber_id") is None:
        query = query.filter(DayOff.barber_id.is_(None))
    else:
        query = query.filter(DayOff.barber_id == data["barber_id"])
    if query.first():
        raise HTTPException(status_code=409, detail="Essa folga já está cadastrada")
    day_off = DayOff(barber_id=data.get("barber_id"), date=target_date, reason=data.get("reason"))
    db.add(day_off)
    db.commit()
    db.refresh(day_off)
    return day_off


def remove_day_off(db: Session, day_off_id: int):
    day_off = db.query(DayOff).filter(DayOff.id == day_off_id).first()
    if not day_off:
        raise HTTPException(status_code=404, detail="Folga não encontrada")
    db.delete(day_off)
    db.commit()
    return {"message": "Folga removida com sucesso"}
