from app.controllers.serializers import barber_out, service_out
from app.services import barber_service, service_service


def list_services(db):
    return [service_out(item) for item in service_service.get_all_services(db)]


def list_admin_services(db):
    return [service_out(item) for item in service_service.get_all_services(db, active_only=False)]


def create_service(db, data):
    return service_out(service_service.create_service(db, data))


def update_service(db, service_id, data):
    return service_out(service_service.update_service(db, service_id, data))


def delete_service(db, service_id):
    return service_service.delete_service(db, service_id)


def list_barbers(db):
    return [barber_out(item) for item in barber_service.get_all_barbers(db)]
