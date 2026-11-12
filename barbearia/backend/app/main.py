# Ponto de entrada da API (exemplo com FastAPI)
from fastapi import FastAPI

app = FastAPI(title="Barbearia API")


@app.get("/")
def raiz():
    return {"status": "ok"}
