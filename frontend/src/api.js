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

export async function getDashboardStats() {
  const resp = await fetch(`${BASE}/api/dashboard/stats`);
  if (!resp.ok) throw new Error(`Failed to fetch dashboard stats: ${resp.statusText}`);
  return resp.json();
}

export async function getRunsList() {
  const resp = await fetch(`${BASE}/api/runs`);
  if (!resp.ok) throw new Error(`Failed to fetch runs: ${resp.statusText}`);
  return resp.json();
}

export async function getHistoricalRun(runId) {
  const resp = await fetch(`${BASE}/api/runs/${runId}`);
  if (!resp.ok) throw new Error(`Failed to fetch run: ${resp.statusText}`);
  return resp.json();
}

export async function getAccounts() {
  const res = await fetch(`${BASE}/api/accounts`);
  if (!res.ok) throw new Error(`Accounts fetch failed: ${res.status}`);
  return res.json();
}

export async function getAccountLeads(domain, filters = {}) {
  const params = new URLSearchParams();
  if (filters.tier) params.set('tier', filters.tier);
  if (filters.min_score != null) params.set('min_score', filters.min_score);
  if (filters.max_score != null) params.set('max_score', filters.max_score);
  if (filters.enriched != null) params.set('enriched', filters.enriched);
  const res = await fetch(`${BASE}/api/accounts/${encodeURIComponent(domain)}/leads?${params}`);
  if (!res.ok) throw new Error(`Account leads fetch failed: ${res.status}`);
  return res.json();
}

export async function updateAccountVertical(domain, vertical) {
  const res = await fetch(`${BASE}/api/accounts/${encodeURIComponent(domain)}/vertical`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vertical }),
  });
  if (!res.ok) throw new Error(`Failed to update vertical: ${res.status}`);
  return res.json();
}

export function getAccountExportUrl(domain, filters = {}) {
  const params = new URLSearchParams();
  if (filters.tier) params.set('tier', filters.tier);
  if (filters.enriched != null) params.set('enriched', filters.enriched);
  return `${BASE}/api/accounts/${encodeURIComponent(domain)}/export/xlsx?${params}`;
}

// ── Waves ────────────────────────────────────────────────────────────────────

export async function getWaves() {
  const res = await fetch(`${BASE}/api/waves`);
  if (!res.ok) throw new Error(`Failed to fetch waves: ${res.status}`);
  return res.json();
}

export async function createWave(name) {
  const res = await fetch(`${BASE}/api/waves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to create wave: ${res.status}`);
  return res.json();
}

export async function getWave(waveId) {
  const res = await fetch(`${BASE}/api/waves/${waveId}`);
  if (!res.ok) throw new Error(`Failed to fetch wave: ${res.status}`);
  return res.json();
}

export async function deleteWave(waveId) {
  const res = await fetch(`${BASE}/api/waves/${waveId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete wave: ${res.status}`);
  return res.json();
}

export async function addWaveAccount(waveId, domain, vertical = null) {
  const res = await fetch(`${BASE}/api/waves/${waveId}/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, vertical }),
  });
  if (!res.ok) throw new Error(`Failed to add account: ${res.status}`);
  return res.json();
}

export async function removeWaveAccount(waveId, domain) {
  const res = await fetch(`${BASE}/api/waves/${waveId}/accounts/${encodeURIComponent(domain)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to remove account: ${res.status}`);
  return res.json();
}

export async function updateWaveAccountVertical(waveId, domain, vertical) {
  const res = await fetch(`${BASE}/api/waves/${waveId}/accounts/${encodeURIComponent(domain)}/vertical`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vertical }),
  });
  if (!res.ok) throw new Error(`Failed to update vertical: ${res.status}`);
  return res.json();
}

export async function runWave(waveId, params) {
  const res = await fetch(`${BASE}/api/waves/${waveId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Failed to run wave: ${res.status}`);
  return res.json();
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

export async function getPipelineStatus() {
  const res = await fetch(`${BASE}/api/pipeline`);
  if (!res.ok) throw new Error(`Pipeline fetch failed: ${res.status}`);
  return res.json();
}
