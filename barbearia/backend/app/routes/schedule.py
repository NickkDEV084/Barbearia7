from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.controllers import schedule_controller
from app.database import get_db
from app.routes.dependencies import get_current_admin
from app.schemas import DayOffInput, ScheduleInput

router = APIRouter(prefix="/api/admin/schedule", tags=["Expediente"])


@router.get("/config")
def get_config(db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return schedule_controller.list_config(db)


@router.put("/config")
def put_config(payload: list[ScheduleInput], db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return schedule_controller.save_config(db, [item.dict() for item in payload])


@router.get("/days-off")
def get_days_off(db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return schedule_controller.list_days_off(db)


@router.post("/days-off", status_code=201)
def create_day_off(payload: DayOffInput, db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return schedule_controller.add_day_off(db, payload.dict())


@router.delete("/days-off/{day_off_id}", status_code=204, response_class=Response, response_model=None)
def delete_day_off(day_off_id: int, db: Session = Depends(get_db), _admin=Depends(get_current_admin)) -> Response:
    schedule_controller.delete_day_off(db, day_off_id)
    return Response(status_code=204)
