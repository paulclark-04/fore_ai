"""GET /api/events/{run_id} — Server-Sent Events stream for pipeline progress."""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from backend.core.pipeline import get_event_queue, get_run

router = APIRouter()


@router.get("/api/events/{run_id}")
async def stream_events(run_id: str):
    """Stream pipeline events as SSE."""

    async def event_generator():
        # Wait briefly for the pipeline to start and create its queue
        for _ in range(50):
            queue = get_event_queue(run_id)
            if queue is not None:
                break
            await asyncio.sleep(0.1)
        else:
            yield f"data: {json.dumps({'step': 'error', 'status': 'error', 'message': 'Run not found'})}\n\n"
            return

        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=60)
                if event is None:
                    # End of stream
                    break
                yield f"data: {event.json()}\n\n"
            except asyncio.TimeoutError:
                # Send keepalive
                yield ": keepalive\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
