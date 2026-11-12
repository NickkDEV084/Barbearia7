def service_out(item):
    return {"id": item.id, "name": item.name, "price": item.price,
            "duration_minutes": item.duration_minutes, "active": item.active}


def barber_out(item):
    return {"id": item.id, "name": item.name, "phone": item.phone,
            "photo_url": item.photo_url, "active": item.active}


def appointment_out(item):
    return {
        "id": item.id,
        "date": item.date.isoformat(),
        "start_time": item.start_time.strftime("%H:%M"),
        "end_time": item.end_time.strftime("%H:%M"),
        "status": item.status,
        "notes": item.notes,
        "client": {"id": item.client.id, "name": item.client.name, "phone": item.client.phone},
        "barber": {"id": item.barber.id, "name": item.barber.name},
        "service": {"id": item.service.id, "name": item.service.name,
                    "price": item.service.price, "duration_minutes": item.service.duration_minutes},
    }


def schedule_out(item):
    return {
        "id": item.id, "barber_id": item.barber_id, "day_of_week": item.day_of_week,
        "start_time": item.start_time.strftime("%H:%M"), "end_time": item.end_time.strftime("%H:%M"),
        "break_start": item.break_start.strftime("%H:%M") if item.break_start else None,
        "break_end": item.break_end.strftime("%H:%M") if item.break_end else None,
        "is_active": item.is_active,
    }


def day_off_out(item):
    return {"id": item.id, "date": item.date.isoformat(), "barber_id": item.barber_id,
            "reason": item.reason}
