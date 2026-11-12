from datetime import date, time
from typing import Optional

from pydantic import BaseModel, Field, constr, validator


class LoginInput(BaseModel):
    username: constr(min_length=1, max_length=80)
    password: constr(min_length=1, max_length=200)


class ServiceInput(BaseModel):
    name: constr(strip_whitespace=True, min_length=2, max_length=100)
    price: float = Field(ge=0, le=100000)
    duration_minutes: int = Field(ge=5, le=480)
    active: bool = True


class AppointmentInput(BaseModel):
    service_id: int = Field(gt=0)
    barber_id: int = Field(gt=0)
    date: date
    start_time: time
    client_name: constr(strip_whitespace=True, min_length=2, max_length=120)
    client_phone: constr(strip_whitespace=True, min_length=10, max_length=24)
    notes: Optional[constr(max_length=500)] = None

    @validator("client_phone")
    def phone_has_a_reasonable_number_of_digits(cls, value):
        digits = "".join(character for character in value if character.isdigit())
        if not 10 <= len(digits) <= 13:
            raise ValueError("Informe um telefone com DDD")
        return value


class StatusInput(BaseModel):
    status: str


class RescheduleInput(BaseModel):
    date: date
    start_time: time


class ScheduleInput(BaseModel):
    barber_id: Optional[int] = None
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    break_start: Optional[time] = None
    break_end: Optional[time] = None
    is_active: bool = True


class DayOffInput(BaseModel):
    barber_id: Optional[int] = None
    date: date
    reason: Optional[constr(max_length=160)] = None
