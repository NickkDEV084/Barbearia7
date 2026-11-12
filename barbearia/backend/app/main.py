from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.database import Base, SessionLocal, engine
from app import models  # Register ORM models before creating the schema.
from app.routes import appointments, auth, catalog, clients, dashboard, schedule
from app.seed import seed_data

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_data(db)
    yield


app = FastAPI(
    title="Gama Estúdio API",
    description="Agendamento e administração do Gama Estúdio ®",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(appointments.router)
app.include_router(schedule.router)
app.include_router(clients.router)
app.include_router(dashboard.router)

app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
