from app.controllers.serializers import appointment_out
from app.services import appointment_service


def available_slots(db, barber_id, target_date, service_id):
    return appointment_service.get_available_slots(db, barber_id, target_date, service_id)


def book(db, data):
    return appointment_out(appointment_service.create_appointment(db, data))


def list_appointments(db, **filters):
    return [appointment_out(item) for item in appointment_service.get_appointments(db, **filters)]


def update_status(db, appointment_id, status):
    return appointment_out(appointment_service.update_appointment_status(db, appointment_id, status))


def reschedule(db, appointment_id, target_date, start_time):
    return appointment_out(appointment_service.reschedule_appointment(db, appointment_id, target_date, start_time))
