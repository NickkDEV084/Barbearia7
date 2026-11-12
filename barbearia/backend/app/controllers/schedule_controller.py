from app.controllers.serializers import day_off_out, schedule_out
from app.services import schedule_service


def list_config(db):
    return [schedule_out(item) for item in schedule_service.get_schedule_config(db)]


def save_config(db, configs):
    return [schedule_out(item) for item in schedule_service.update_schedule_config(db, configs)]


def list_days_off(db):
    return [day_off_out(item) for item in schedule_service.get_days_off(db)]


def add_day_off(db, data):
    return day_off_out(schedule_service.add_day_off(db, data))


def delete_day_off(db, day_off_id):
    return schedule_service.remove_day_off(db, day_off_id)
