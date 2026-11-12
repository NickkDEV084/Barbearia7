from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.appointment import Appointment
from app.models.service import Service

ACTIVE_STATUSES = ("pending", "confirmed", "rescheduled", "completed")


def get_dashboard(db: Session):
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    month_start = today.replace(day=1)
    next_month = month_start.replace(day=28) + timedelta(days=4)
    month_end = next_month.replace(day=1) - timedelta(days=1)

    def total(start, end):
        query = db.query(func.coalesce(func.sum(Service.price), 0)).join(
            Appointment, Appointment.service_id == Service.id
        ).filter(Appointment.status.in_(ACTIVE_STATUSES), Appointment.date >= start)
        if end:
            query = query.filter(Appointment.date <= end)
        return float(query.scalar() or 0)

    today_appointments = db.query(Appointment).filter(
        Appointment.date == today, Appointment.status.in_(ACTIVE_STATUSES)
    ).count()
    top = db.query(Service.name, func.count(Appointment.id).label("count")).join(
        Appointment, Appointment.service_id == Service.id
    ).filter(Appointment.status != "cancelled").group_by(Service.id).order_by(func.count(Appointment.id).desc()).limit(5).all()
    upcoming = db.query(Appointment).options(
        joinedload(Appointment.client), joinedload(Appointment.barber), joinedload(Appointment.service)
    ).filter(
        Appointment.date >= today, Appointment.status.in_(ACTIVE_STATUSES)
    ).order_by(Appointment.date, Appointment.start_time).limit(6).all()

    return {
        "today_appointments": today_appointments,
        "today_revenue": total(today, today),
        "week_revenue": total(week_start, week_end),
        "month_revenue": total(month_start, month_end),
        "top_services": [{"name": name, "count": count} for name, count in top],
        "upcoming": [
            {
                "id": item.id,
                "date": item.date.isoformat(),
                "start_time": item.start_time.strftime("%H:%M"),
                "client": item.client.name,
                "barber": item.barber.name,
                "service": item.service.name,
                "price": item.service.price,
                "status": item.status,
            }
            for item in upcoming
        ],
    }
