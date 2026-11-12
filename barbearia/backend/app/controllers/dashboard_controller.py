from app.services.dashboard_service import get_dashboard


def dashboard_data(db):
    return get_dashboard(db)
