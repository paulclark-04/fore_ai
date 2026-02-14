"""FastAPI app for Fore AI Lead Scorer."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes import search, events, results, export

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


@app.get("/api/health")
async def health():
    return {"status": "ok"}
