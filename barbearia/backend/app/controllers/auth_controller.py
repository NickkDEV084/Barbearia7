from app.services.auth_service import login


def sign_in(db, username, password):
    return login(db, username, password)
