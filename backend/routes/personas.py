"""CRUD endpoints for persona presets (title keyword lists)."""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "personas.json"


class PersonaCreate(BaseModel):
    name: str
    job_titles: List[str]
    seniority_levels: Optional[List[str]] = None
    location: Optional[List[str]] = None
    email_status: Optional[List[str]] = None


class Persona(BaseModel):
    id: str
    name: str
    job_titles: List[str]
    seniority_levels: Optional[List[str]] = None
    location: Optional[List[str]] = None
    email_status: Optional[List[str]] = None


def _read_personas() -> list:
    if not DATA_FILE.exists():
        return []
    return json.loads(DATA_FILE.read_text())


def _write_personas(personas: list):
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(personas, indent=2, ensure_ascii=False) + "\n")


@router.get("/api/personas", response_model=List[Persona])
async def list_personas():
    return _read_personas()


@router.post("/api/personas", response_model=Persona, status_code=201)
async def create_persona(body: PersonaCreate):
    personas = _read_personas()
    persona = {
        "id": str(uuid.uuid4())[:8],
        "name": body.name,
        "job_titles": body.job_titles,
        "seniority_levels": body.seniority_levels,
        "location": body.location,
        "email_status": body.email_status,
    }
    personas.append(persona)
    _write_personas(personas)
    return persona


@router.delete("/api/personas/{persona_id}", status_code=204)
async def delete_persona(persona_id: str):
    personas = _read_personas()
    filtered = [p for p in personas if p["id"] != persona_id]
    if len(filtered) == len(personas):
        raise HTTPException(status_code=404, detail="Persona not found")
    _write_personas(filtered)
