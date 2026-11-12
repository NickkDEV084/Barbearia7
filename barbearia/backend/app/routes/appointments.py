from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import appointment_controller
from app.database import get_db
from app.routes.dependencies import get_current_admin
from app.schemas import AppointmentInput, RescheduleInput, StatusInput

router = APIRouter(prefix="/api", tags=["Agendamentos"])


@router.get("/appointments/available-slots")
def available_slots(barber_id: int, target_date: date, service_id: int, db: Session = Depends(get_db)):
    return appointment_controller.available_slots(db, barber_id, target_date, service_id)


@router.post("/appointments", status_code=201)
def create_appointment(payload: AppointmentInput, db: Session = Depends(get_db)):
    return appointment_controller.book(db, payload.dict())


@router.get("/admin/appointments")
def list_appointments(
    target_date: date | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    barber_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    return appointment_controller.list_appointments(
        db, target_date=target_date, date_from=date_from, date_to=date_to, barber_id=barber_id, status=status
    )


@router.patch("/admin/appointments/{appointment_id}/status")
def update_status(appointment_id: int, payload: StatusInput, db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return appointment_controller.update_status(db, appointment_id, payload.status)


@router.put("/admin/appointments/{appointment_id}/reschedule")
def reschedule(appointment_id: int, payload: RescheduleInput, db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return appointment_controller.reschedule(db, appointment_id, payload.date, payload.start_time)
