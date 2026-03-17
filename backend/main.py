"""FastAPI app for Fore AI Lead Scorer."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes import search, events, results, export, personas, runs, dashboard, accounts, waves, pipeline
from backend.core.database import init_db

app = FastAPI(title="Fore AI Lead Scorer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router)
app.include_router(events.router)
app.include_router(results.router)
app.include_router(export.router)
app.include_router(personas.router)
app.include_router(runs.router)
app.include_router(dashboard.router)
app.include_router(accounts.router)
app.include_router(waves.router)
app.include_router(pipeline.router)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/health")
async def health():
    return {"status": "ok"}
