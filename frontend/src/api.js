const BASE = '';

export async function startSearch(params) {
  const resp = await fetch(`${BASE}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!resp.ok) throw new Error(`Search failed: ${resp.statusText}`);
  return resp.json();
}

export function subscribeEvents(runId, onEvent) {
  const es = new EventSource(`${BASE}/api/events/${runId}`);
  es.onmessage = (e) => {
    const event = JSON.parse(e.data);
    onEvent(event);
    if (event.step === 'done' || event.step === 'error') {
      es.close();
    }
  };
  es.onerror = () => {
    es.close();
  };
  return es;
}

export async function getResults(runId) {
  const resp = await fetch(`${BASE}/api/results/${runId}`);
  if (!resp.ok) throw new Error(`Failed to get results: ${resp.statusText}`);
  return resp.json();
}

export function getExportUrl(runId) {
  return `${BASE}/api/export/${runId}/xlsx`;
}
