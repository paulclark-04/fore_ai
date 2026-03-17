import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getWaves, createWave, getWave, deleteWave,
  addWaveAccount, removeWaveAccount, updateWaveAccountVertical,
  runWave, subscribeEvents, getResults, getExportUrl,
} from '../api';

const STEP_LABELS = {
  search: 'Searching',
  filter: 'Filtering',
  enrich: 'Enriching',
  score:  'Scoring',
};

const VERTICALS = ['banking', 'insurance', 'media', 'ecommerce', 'travel'];
const VERTICAL_LABELS = {
  banking: 'Banking',
  insurance: 'Insurance',
  media: 'Media',
  ecommerce: 'E-commerce',
  travel: 'Travel',
};

const SENIORITY_OPTIONS = [
  { value: 'c_suite', label: 'C-Suite' },
  { value: 'vp', label: 'VP' },
  { value: 'owner', label: 'Owner' },
  { value: 'partner', label: 'Partner' },
  { value: 'director', label: 'Director' },
  { value: 'head', label: 'Head' },
  { value: 'manager', label: 'Manager' },
  { value: 'senior', label: 'Senior' },
];

const EMAIL_STATUS_OPTIONS = [
  { value: 'validated', label: 'Validated' },
  { value: 'not_validated', label: 'Not Validated' },
  { value: 'unknown', label: 'Unknown' },
];

function StatusBadge({ status }) {
  const styles = {
    draft: 'border-[#E5E7EB] text-[#4e4f4d]',
    running: 'border-[#075056] text-[#075056] bg-[#075056]/5',
    complete: 'border-[#5acf5d] text-[#2a7a2c]',
    error: 'border-[#ce4100] text-[#ce4100]',
    pending: 'border-[#E5E7EB] text-[#A3A3A3]',
    stale: 'border-[#E5E7EB] text-[#A3A3A3]',
  };
  const labels = {
    draft: 'Draft',
    running: 'Running…',
    complete: 'Complete',
    error: 'Error',
    pending: 'Pending',
    stale: 'Stale',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] font-[var(--font-fore-mono)] border ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}

// ── Wave List ────────────────────────────────────────────────────────────────

function WaveList({ waves, onSelect, onDelete, onCreated }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const wave = await createWave(newName.trim());
      onCreated(wave);
      setNewName('');
      setShowCreate(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-10">
        <div>
          <h1 className="text-5xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter leading-none">
            Waves
          </h1>
          <p className="text-sm text-[#4e4f4d] mt-2">
            Group accounts into weekly waves and run them simultaneously
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-5 py-2 text-[10px] border-2 border-[#075056] bg-[#075056] text-white uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] hover:bg-[#053d41] transition-colors duration-100 cursor-pointer"
        >
          + New Wave
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-8 flex items-center gap-4 p-5 border-2 border-[#075056] bg-[#075056]/5">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Wave name, e.g. Week 8 — E-commerce"
            className="flex-1 px-0 py-2 bg-transparent border-0 border-b-2 border-[#075056] text-base text-black placeholder:text-[#A3A3A3] placeholder:italic focus:outline-none"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="px-5 py-2 text-[10px] border-2 border-[#075056] bg-[#075056] text-white uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] hover:bg-[#053d41] transition-colors duration-100 cursor-pointer disabled:opacity-40"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => { setShowCreate(false); setNewName(''); }}
            className="text-[10px] text-[#4e4f4d] hover:text-[#075056] uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] cursor-pointer transition-colors duration-100"
          >
            Cancel
          </button>
        </form>
      )}

      {waves.length === 0 ? (
        <div className="border-t-2 border-[#075056] pt-8 pb-12 text-center">
          <p className="text-lg text-[#4e4f4d] mb-2">No waves yet</p>
          <p className="text-sm text-[#A3A3A3]">Create a wave to group accounts and source them simultaneously</p>
        </div>
      ) : (
        <div className="border-t-2 border-[#075056] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                {['Name', 'Accounts', 'Status', 'Created'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">
                    {h}
                  </th>
                ))}
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {waves.map((w) => (
                <tr
                  key={w.id}
                  onClick={() => onSelect(w.id)}
                  className="bg-white hover:bg-[#F6F8F9] transition-colors duration-100 cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-black">{w.name}</td>
                  <td className="px-4 py-3 text-[#4e4f4d]">{w.account_count}</td>
                  <td className="px-4 py-3"><StatusBadge status={w.status} /></td>
                  <td className="px-4 py-3 text-[#4e4f4d] whitespace-nowrap">
                    {new Date(w.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onDelete(w.id)}
                      className="text-[10px] text-[#ce4100] hover:text-[#ce4100]/70 uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] cursor-pointer transition-colors duration-100"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Wave Detail ──────────────────────────────────────────────────────────────

function WaveDetail({ waveId, onBack }) {
  const [wave, setWave] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add account form
  const [addDomain, setAddDomain] = useState('');
  const [addVertical, setAddVertical] = useState('');
  const [addError, setAddError] = useState(null);

  // Run params
  const [fetchCount, setFetchCount] = useState(100);
  const [enableScoring, setEnableScoring] = useState(false);
  const [titleKeywords, setTitleKeywords] = useState('');
  const [seniorities, setSeniorities] = useState(['c_suite', 'vp', 'director', 'head']);
  const [location, setLocation] = useState('france');
  const [emailStatus, setEmailStatus] = useState(['validated']);

  // Personas
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState('');

  // Per-domain run progress: { domain: { status, step, progress, total, message, run_id, leads_count } }
  const [runProgress, setRunProgress] = useState({});
  const [isWaveRunning, setIsWaveRunning] = useState(false);
  const [runError, setRunError] = useState(null);

  // Refs to avoid double-subscribing and to clean up EventSources on unmount
  const subscribedRunIds = useRef(new Set());
  const eventSources = useRef([]);
  // Only let loadWave set isWaveRunning on the very first fetch
  const initialLoadDone = useRef(false);

  // Load personas
  useEffect(() => {
    fetch('/api/personas').then((r) => r.json()).then(setPersonas).catch(() => {});
  }, []);

  // Load wave — merges DB status into runProgress so SSE-derived step info is preserved
  const loadWave = useCallback(async () => {
    try {
      const data = await getWave(waveId);
      setWave(data);
      setRunProgress(prev => {
        const next = { ...prev };
        for (const acct of data.accounts || []) {
          if (!acct.run_id) continue;
          const existing = next[acct.domain] || {};
          const dbStatus = acct.run_status;
          // Trust terminal DB status (complete/error); otherwise keep the local status
          // so that SSE-derived 'stale' or step labels aren't overwritten
          const resolvedStatus =
            dbStatus === 'complete' || dbStatus === 'error'
              ? dbStatus
              : existing.status || dbStatus;
          next[acct.domain] = {
            ...existing,
            run_id: acct.run_id,
            status: resolvedStatus,
            leads_count: acct.leads_count ?? existing.leads_count ?? 0,
          };
        }
        return next;
      });
      // Only drive isWaveRunning from DB on the very first load;
      // after that it is controlled by SSE handlers and handleRunWave
      if (!initialLoadDone.current) {
        if (data.status === 'running') setIsWaveRunning(true);
        initialLoadDone.current = true;
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [waveId]);

  useEffect(() => { loadWave(); }, [loadWave]);

  // Auto-subscribe to SSE for any accounts with run_status 'running' that we haven't subscribed to yet.
  // This handles the case where the user navigates to a wave that's already in progress.
  useEffect(() => {
    if (!wave) return;
    const runningAccounts = (wave.accounts || []).filter(
      a => a.run_status === 'running' && a.run_id && !subscribedRunIds.current.has(a.run_id),
    );
    if (runningAccounts.length === 0) return;

    let completedCount = 0;
    const total = runningAccounts.length;

    for (const acct of runningAccounts) {
      const { run_id, domain } = acct;
      subscribedRunIds.current.add(run_id);

      const es = subscribeEvents(run_id, async (event) => {
        // "Run not found" means the backend was restarted and the in-memory queue is gone
        const isOrphaned = event.step === 'error' && event.message?.includes('Run not found');

        setRunProgress(prev => ({
          ...prev,
          [domain]: {
            ...prev[domain],
            run_id,
            status: isOrphaned
              ? 'stale'
              : event.step === 'done'
              ? 'complete'
              : event.step === 'error'
              ? 'error'
              : 'running',
            step: event.step,
            progress: event.progress ?? prev[domain]?.progress ?? 0,
            total: event.total ?? prev[domain]?.total ?? 0,
            message: event.message,
          },
        }));

        if (event.step === 'done' || event.step === 'error' || isOrphaned) {
          completedCount++;
          if (completedCount >= total) {
            setIsWaveRunning(false);
            await loadWave();
          }
        }
      });
      eventSources.current.push(es);
    }
  }, [wave, loadWave]);

  // Close all EventSources on unmount
  useEffect(() => {
    return () => { eventSources.current.forEach(es => es.close()); };
  }, []);

  const handlePersonaSelect = (personaId) => {
    setSelectedPersona(personaId);
    if (!personaId) return;
    const p = personas.find((x) => x.id === personaId);
    if (p) {
      setTitleKeywords(p.job_titles.join(', '));
      if (p.seniority_levels) setSeniorities(p.seniority_levels);
      if (p.location) setLocation(p.location.join(', '));
      if (p.email_status) setEmailStatus(p.email_status);
    }
  };

  const toggleSeniority = (val) =>
    setSeniorities((prev) => prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]);

  const toggleEmailStatus = (val) =>
    setEmailStatus((prev) => prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    setAddError(null);
    let domain = addDomain.trim().toLowerCase();
    domain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
    if (!domain) return;
    try {
      await addWaveAccount(waveId, domain, addVertical || null);
      setAddDomain('');
      setAddVertical('');
      await loadWave();
    } catch (err) {
      setAddError(err.message);
    }
  };

  const handleRemoveAccount = async (domain) => {
    try {
      await removeWaveAccount(waveId, domain);
      await loadWave();
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerticalChange = async (domain, vertical) => {
    try {
      await updateWaveAccountVertical(waveId, domain, vertical || null);
      setWave((prev) => ({
        ...prev,
        accounts: prev.accounts.map((a) => a.domain === domain ? { ...a, vertical: vertical || null } : a),
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunWave = async () => {
    setRunError(null);
    setIsWaveRunning(true);

    const params = {
      fetch_count: fetchCount,
      enable_scoring: enableScoring,
    };
    if (titleKeywords.trim()) {
      params.job_titles = titleKeywords.split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (seniorities.length > 0) params.seniority_levels = seniorities;
    if (location.trim()) params.location = location.split(',').map((l) => l.trim()).filter(Boolean);
    if (emailStatus.length > 0) params.email_status = emailStatus;

    try {
      const result = await runWave(waveId, params);
      const accountRunIds = result.account_run_ids || {};

      // Initialise progress for all domains
      const initial = {};
      for (const [domain, runId] of Object.entries(accountRunIds)) {
        initial[domain] = { run_id: runId, status: 'running', progress: 0, total: 0 };
      }
      setRunProgress(initial);

      // Subscribe to SSE for each domain
      let completedCount = 0;
      const total = Object.keys(accountRunIds).length;

      for (const [domain, runId] of Object.entries(accountRunIds)) {
        subscribedRunIds.current.add(runId);
        const es = subscribeEvents(runId, async (event) => {
          setRunProgress((prev) => ({
            ...prev,
            [domain]: {
              ...prev[domain],
              run_id: runId,
              status: event.step === 'done' ? 'complete' : event.step === 'error' ? 'error' : 'running',
              step: event.step,
              progress: event.progress || prev[domain]?.progress || 0,
              total: event.total || prev[domain]?.total || 0,
              message: event.message,
            },
          }));

          if (event.step === 'done' || event.step === 'error') {
            completedCount++;
            if (completedCount >= total) {
              setIsWaveRunning(false);
              await loadWave();
            }
          }
        });
        eventSources.current.push(es);
      }
    } catch (err) {
      setRunError(err.message);
      setIsWaveRunning(false);
    }
  };

  if (loading) {
    return (
      <div>
        <button onClick={onBack} className="text-[11px] text-[#4e4f4d] hover:text-[#075056] mb-4 flex items-center gap-2 transition-colors cursor-pointer uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)]">
          ← Back to Waves
        </button>
        <p className="text-sm text-[#4e4f4d]">Loading…</p>
      </div>
    );
  }

  if (error || !wave) {
    return (
      <div>
        <button onClick={onBack} className="text-[11px] text-[#4e4f4d] hover:text-[#075056] mb-4 flex items-center gap-2 transition-colors cursor-pointer uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)]">
          ← Back to Waves
        </button>
        <div className="border-l-4 border-[#ce4100] pl-4 py-3 text-sm text-[#ce4100]">{error || 'Wave not found'}</div>
      </div>
    );
  }

  const accounts = wave.accounts || [];
  const allDone = accounts.length > 0 && accounts.every((a) => {
    const p = runProgress[a.domain];
    return p && (p.status === 'complete' || p.status === 'error' || p.status === 'stale');
  });

  return (
    <div>
      {/* Header */}
      <button
        onClick={onBack}
        className="text-[11px] text-[#4e4f4d] hover:text-[#075056] mb-4 flex items-center gap-2 transition-colors duration-100 cursor-pointer uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)]"
      >
        ← Back to Waves
      </button>
      <div className="flex items-center gap-4 mb-10">
        <h1 className="text-5xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter leading-none">
          {wave.name}
        </h1>
        <StatusBadge status={isWaveRunning ? 'running' : wave.status} />
      </div>

      {/* ── Accounts section ── */}
      <div className="mb-10">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)] mb-4">
          Accounts — {accounts.length}
        </h2>

        {accounts.length === 0 ? (
          <p className="text-sm text-[#A3A3A3] mb-4">No accounts added yet.</p>
        ) : (
          <div className="border-t-2 border-[#075056] overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">Domain</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">Vertical</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">Status</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">Leads</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">Export</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {accounts.map((acct) => {
                  const prog = runProgress[acct.domain];
                  const domainStatus = prog?.status || acct.run_status || 'pending';
                  const leadsCount = prog?.leads_count ?? acct.leads_count ?? 0;
                  const runId = prog?.run_id || acct.run_id;
                  return (
                    <tr key={acct.domain} className="bg-white">
                      <td className="px-4 py-3 font-medium text-black font-[var(--font-fore-mono)] text-sm">{acct.domain}</td>
                      <td className="px-4 py-3">
                        <select
                          value={acct.vertical || ''}
                          onChange={(e) => handleVerticalChange(acct.domain, e.target.value)}
                          className={`text-[10px] bg-transparent appearance-none px-2 py-1 cursor-pointer font-[var(--font-fore-mono)] uppercase tracking-[0.08em] rounded-none border transition-colors duration-100 ${
                            acct.vertical ? 'border-[#075056] text-[#075056]' : 'border-[#E5E7EB] text-[#A3A3A3]'
                          }`}
                        >
                          <option value="">— None —</option>
                          {VERTICALS.map((v) => (
                            <option key={v} value={v}>{VERTICAL_LABELS[v]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {domainStatus === 'running' && prog ? (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-[#075056] font-[var(--font-fore-mono)]">
                              {STEP_LABELS[prog.step] ? `${STEP_LABELS[prog.step]}…` : 'Running…'}
                            </span>
                            {prog.total > 0 && (
                              <span className="text-[9px] text-[#4e4f4d] font-[var(--font-fore-mono)]">
                                {prog.progress}/{prog.total}
                              </span>
                            )}
                          </div>
                        ) : (
                          <StatusBadge status={domainStatus} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-[#4e4f4d] font-[var(--font-fore-mono)]">
                        {leadsCount > 0 ? leadsCount : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {runId && domainStatus === 'complete' ? (
                          <a
                            href={getExportUrl(runId)}
                            download
                            className="text-[10px] text-[#075056] hover:text-[#053d41] uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] cursor-pointer transition-colors duration-100 inline-flex items-center gap-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            XLSX
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {domainStatus === 'pending' && (
                          <button
                            onClick={() => handleRemoveAccount(acct.domain)}
                            className="text-[10px] text-[#ce4100] hover:text-[#ce4100]/70 font-[var(--font-fore-mono)] cursor-pointer transition-colors duration-100"
                            title="Remove"
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Add account form */}
        {!isWaveRunning && (
          <form onSubmit={handleAddAccount} className="flex items-center gap-3">
            <input
              type="text"
              value={addDomain}
              onChange={(e) => setAddDomain(e.target.value)}
              placeholder="domain.com"
              className="w-52 px-0 py-2 bg-transparent border-0 border-b-2 border-[#E5E7EB] text-sm text-black placeholder:text-[#A3A3A3] placeholder:italic focus:border-[#075056] focus:outline-none transition-all duration-100"
            />
            <select
              value={addVertical}
              onChange={(e) => setAddVertical(e.target.value)}
              className="text-[11px] bg-transparent border border-[#E5E7EB] text-[#4e4f4d] appearance-none px-3 py-1.5 cursor-pointer font-[var(--font-fore-mono)] uppercase tracking-[0.08em] rounded-none"
            >
              <option value="">Vertical (optional)</option>
              {VERTICALS.map((v) => (
                <option key={v} value={v}>{VERTICAL_LABELS[v]}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!addDomain.trim()}
              className="px-4 py-1.5 text-[10px] border-2 border-[#075056] text-[#075056] uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] hover:bg-[#075056] hover:text-white transition-colors duration-100 cursor-pointer disabled:opacity-40"
            >
              Add
            </button>
            {addError && <span className="text-[10px] text-[#ce4100] font-[var(--font-fore-mono)]">{addError}</span>}
          </form>
        )}
      </div>

      {/* ── Search Settings + Run ── */}
      {!allDone && (
        <div className="border-t-2 border-[#E5E7EB] pt-8">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)] mb-6">
            Search Settings
          </h2>

          <div className="space-y-6 mb-8">
            {/* Persona preset */}
            <div>
              <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
                Persona Preset
              </label>
              <select
                value={selectedPersona}
                onChange={(e) => handlePersonaSelect(e.target.value)}
                className="w-full max-w-md px-0 py-2 bg-transparent border-0 border-b-[1.5px] border-[#E5E7EB] text-base text-black focus:border-[#075056] focus:outline-none appearance-none transition-all duration-100 cursor-pointer"
              >
                <option value="">— Select a preset —</option>
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Title keywords */}
            <div>
              <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
                Title Keywords <span className="normal-case tracking-normal text-[#A3A3A3] font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={titleKeywords}
                onChange={(e) => { setTitleKeywords(e.target.value); setSelectedPersona(''); }}
                placeholder="e.g. qa, devops, cto, engineering, test"
                className="w-full max-w-md px-0 py-2 bg-transparent border-0 border-b-[1.5px] border-[#E5E7EB] text-base text-black placeholder:text-[#A3A3A3] placeholder:italic focus:border-[#075056] focus:outline-none transition-all duration-100"
              />
            </div>

            {/* Seniority */}
            <div>
              <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
                Seniority Levels
              </label>
              <div className="flex flex-wrap gap-2">
                {SENIORITY_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleSeniority(value)}
                    className={`px-4 py-2 text-[10px] border-2 transition-colors duration-100 cursor-pointer uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] rounded-none ${
                      seniorities.includes(value)
                        ? 'bg-[#075056] border-[#075056] text-white'
                        : 'bg-white border-[#E5E7EB] text-[#4e4f4d] hover:border-[#075056] hover:text-[#075056]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. france"
                className="w-full max-w-xs px-0 py-2 bg-transparent border-0 border-b-[1.5px] border-[#E5E7EB] text-base text-black placeholder:text-[#A3A3A3] placeholder:italic focus:border-[#075056] focus:outline-none transition-all duration-100"
              />
            </div>

            {/* Email status */}
            <div>
              <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
                Email Status
              </label>
              <div className="flex flex-wrap gap-2">
                {EMAIL_STATUS_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleEmailStatus(value)}
                    className={`px-4 py-2 text-[10px] border-2 transition-colors duration-100 cursor-pointer uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] rounded-none ${
                      emailStatus.includes(value)
                        ? 'bg-[#075056] border-[#075056] text-white'
                        : 'bg-white border-[#E5E7EB] text-[#4e4f4d] hover:border-[#075056] hover:text-[#075056]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fetch count + scoring */}
            <div className="flex items-center gap-8">
              <div>
                <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
                  Leads per Account
                </label>
                <input
                  type="number"
                  value={fetchCount}
                  onChange={(e) => setFetchCount(Number(e.target.value))}
                  min={1}
                  max={500}
                  className="w-24 px-0 py-2 bg-transparent border-0 border-b-[1.5px] border-[#E5E7EB] text-base text-black focus:border-[#075056] focus:outline-none transition-all duration-100"
                />
              </div>
              <div className="flex items-center gap-3 mt-5">
                <input
                  type="checkbox"
                  id="wave-scoring"
                  checked={enableScoring}
                  onChange={(e) => setEnableScoring(e.target.checked)}
                  className="w-4 h-4 accent-[#075056] cursor-pointer"
                />
                <label htmlFor="wave-scoring" className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#4e4f4d] font-[var(--font-fore-mono)] cursor-pointer">
                  Enable AI Scoring
                </label>
              </div>
            </div>
          </div>

          {/* Run button */}
          {runError && (
            <div className="border-l-4 border-[#ce4100] pl-4 py-3 text-sm text-[#ce4100] mb-4">
              {runError}
            </div>
          )}
          <button
            onClick={handleRunWave}
            disabled={isWaveRunning || accounts.length === 0}
            className="px-8 py-3 text-sm border-2 border-[#075056] bg-[#075056] text-white uppercase tracking-[0.1em] font-semibold font-[var(--font-fore-mono)] hover:bg-[#053d41] transition-colors duration-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isWaveRunning
              ? `Running ${accounts.length} account${accounts.length !== 1 ? 's' : ''}…`
              : `▶ Run Wave — ${accounts.length} account${accounts.length !== 1 ? 's' : ''}`}
          </button>
          {accounts.length === 0 && (
            <p className="text-[10px] text-[#A3A3A3] font-[var(--font-fore-mono)] mt-2">Add accounts above before running</p>
          )}
        </div>
      )}

      {/* All done summary */}
      {allDone && (
        <div className="border-t-2 border-[#5acf5d] pt-6 mt-8">
          <p className="text-sm font-medium text-[#2a7a2c] mb-1">Wave complete</p>
          <p className="text-[11px] text-[#4e4f4d] font-[var(--font-fore-mono)]">
            Download individual results using the XLSX links above, or run the wave again with different settings.
          </p>
          <button
            onClick={handleRunWave}
            disabled={isWaveRunning}
            className="mt-4 px-6 py-2 text-[10px] border-2 border-[#075056] text-[#075056] uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] hover:bg-[#075056] hover:text-white transition-colors duration-100 cursor-pointer disabled:opacity-40"
          >
            Re-run Wave
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function WavesPage() {
  const [waves, setWaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWaveId, setSelectedWaveId] = useState(null);

  useEffect(() => {
    getWaves()
      .then(setWaves)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleWaveCreated = (wave) => {
    setWaves((prev) => [wave, ...prev]);
    setSelectedWaveId(wave.id);
  };

  const handleDelete = async (waveId) => {
    try {
      await deleteWave(waveId);
      setWaves((prev) => prev.filter((w) => w.id !== waveId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleBack = () => {
    setSelectedWaveId(null);
    // Re-fetch waves to pick up status changes
    getWaves().then(setWaves).catch(console.error);
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-5xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter leading-none mb-10">Waves</h1>
        <p className="text-sm text-[#4e4f4d]">Loading…</p>
      </div>
    );
  }

  if (selectedWaveId) {
    return <WaveDetail waveId={selectedWaveId} onBack={handleBack} />;
  }

  return (
    <WaveList
      waves={waves}
      onSelect={setSelectedWaveId}
      onDelete={handleDelete}
      onCreated={handleWaveCreated}
    />
  );
}
