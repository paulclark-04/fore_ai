import { useState, useEffect, useCallback, useRef } from 'react';
import { getPipelineStatus, getExportUrl } from '../api';

// ── Constants ─────────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'search',   label: 'Searching' },
  { key: 'filter',   label: 'Filtering' },
  { key: 'enrich',   label: 'Enriching' },
  { key: 'score',    label: 'Scoring' },
  { key: 'complete', label: 'Complete' },
  { key: 'failed',   label: 'Failed' },
];

function getColumnKey(card) {
  if (card.status === 'complete') return 'complete';
  if (card.status === 'error') return 'failed';
  // running card
  const step = card.step;
  if (step === 'search' || step === 'filter' || step === 'enrich' || step === 'score') return step;
  return 'search'; // null/unknown → Searching
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value, total }) {
  if (!value || !total || total === 0) return null;
  const pct = Math.min(100, Math.round((value / total) * 100));
  return (
    <div className="mt-2">
      <div className="h-[3px] w-full bg-[#E5E7EB] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#075056] rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[9px] text-[#4e4f4d] font-[var(--font-fore-mono)] mt-0.5 block">
        {value}/{total}
      </span>
    </div>
  );
}

// ── Tier Dots ─────────────────────────────────────────────────────────────────

function TierBreakdown({ tierA, tierB, tierC, tierD }) {
  const hasAny = (tierA || 0) + (tierB || 0) + (tierC || 0) + (tierD || 0) > 0;
  if (!hasAny) return null;
  const items = [
    { label: 'A', count: tierA || 0, color: '#2a7a2c' },
    { label: 'B', count: tierB || 0, color: '#075056' },
    { label: 'C', count: tierC || 0, color: '#4e4f4d' },
    { label: 'D', count: tierD || 0, color: '#A3A3A3' },
  ].filter((i) => i.count > 0);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.map(({ label, count, color }) => (
        <span
          key={label}
          className="text-[9px] font-[var(--font-fore-mono)] font-semibold uppercase tracking-[0.08em]"
          style={{ color }}
        >
          {label}:{count}
        </span>
      ))}
    </div>
  );
}

// ── Pipeline Card ─────────────────────────────────────────────────────────────

function PipelineCard({ card }) {
  const colKey = getColumnKey(card);

  const borderColor =
    colKey === 'complete' ? '#5acf5d' :
    colKey === 'failed'   ? '#ce4100' :
    '#075056';

  const hasTiers = (card.tier_a || 0) + (card.tier_b || 0) + (card.tier_c || 0) + (card.tier_d || 0) > 0;
  const leadsCount = card.total_results || card.leads_found || 0;

  return (
    <div
      className="bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.06)] rounded-none p-3 mb-2 text-left w-full"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      {/* Domain */}
      <p className="text-[12px] font-bold text-black font-[var(--font-fore-mono)] leading-snug truncate">
        {card.domain}
      </p>

      {/* Wave label */}
      {card.wave_name && (
        <p className="text-[9px] text-[#A3A3A3] font-[var(--font-fore-mono)] mt-0.5 truncate">
          {card.wave_name}
        </p>
      )}

      {/* Progress bar (running only) */}
      {colKey !== 'complete' && colKey !== 'failed' && (
        <ProgressBar value={card.step_progress} total={card.step_total} />
      )}

      {/* Step message */}
      {card.step_message && colKey !== 'complete' && colKey !== 'failed' && (
        <p className="text-[9px] text-[#4e4f4d] mt-1 leading-tight line-clamp-2">
          {card.step_message}
        </p>
      )}

      {/* Complete: leads + tiers + download */}
      {colKey === 'complete' && (
        <div className="mt-2 space-y-1.5">
          <p className="text-[10px] text-[#4e4f4d] font-[var(--font-fore-mono)]">
            {leadsCount > 0 ? `${leadsCount} lead${leadsCount !== 1 ? 's' : ''}` : 'No leads'}
            {hasTiers && ' ·'}
          </p>
          {hasTiers && (
            <TierBreakdown
              tierA={card.tier_a}
              tierB={card.tier_b}
              tierC={card.tier_c}
              tierD={card.tier_d}
            />
          )}
          {card.export_available && (
            <a
              href={getExportUrl(card.run_id)}
              download
              className="inline-flex items-center gap-1 text-[9px] text-[#075056] hover:text-[#053d41] uppercase tracking-[0.1em] font-semibold font-[var(--font-fore-mono)] transition-colors duration-100 mt-0.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              XLSX
            </a>
          )}
        </div>
      )}

      {/* Failed: show message */}
      {colKey === 'failed' && card.step_message && (
        <p className="text-[9px] text-[#ce4100] mt-1 leading-tight line-clamp-2">
          {card.step_message}
        </p>
      )}

      {/* Date */}
      <p className="text-[9px] text-[#A3A3A3] font-[var(--font-fore-mono)] mt-2">
        {formatDate(card.created_at)}
      </p>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────

function KanbanColumn({ column, cards }) {
  const isActive = cards.length > 0;

  return (
    <div className="flex-shrink-0 w-[220px] flex flex-col">
      {/* Column header */}
      <div
        className="pb-2 mb-3"
        style={{ borderBottom: `2px solid ${isActive ? '#075056' : '#E5E7EB'}` }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[9px] font-semibold uppercase tracking-[0.18em] font-[var(--font-fore-mono)]"
            style={{ color: isActive ? '#075056' : '#A3A3A3' }}
          >
            {column.label}
          </span>
          {cards.length > 0 && (
            <span className="text-[9px] font-[var(--font-fore-mono)] font-semibold text-white bg-[#075056] px-1.5 py-0.5 leading-none">
              {cards.length}
            </span>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
        {cards.length === 0 ? (
          <div className="border border-dashed border-[#E5E7EB] p-4 text-center">
            <p className="text-[9px] text-[#A3A3A3] font-[var(--font-fore-mono)] uppercase tracking-[0.1em]">
              Empty
            </p>
          </div>
        ) : (
          cards.map((card) => (
            <PipelineCard key={card.run_id} card={card} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchPipeline = useCallback(async () => {
    try {
      const data = await getPipelineStatus();
      setCards(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  // Set up / tear down polling interval based on whether any cards are running
  useEffect(() => {
    const hasRunning = cards.some((c) => c.status === 'running');

    if (hasRunning) {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(fetchPipeline, 4000);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [cards, fetchPipeline]);

  // Distribute cards into columns
  const columnCards = {};
  for (const col of COLUMNS) {
    columnCards[col.key] = [];
  }
  for (const card of cards) {
    const key = getColumnKey(card);
    if (columnCards[key]) {
      columnCards[key].push(card);
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-10">
        <h1 className="text-5xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter leading-none">
          Pipeline
        </h1>
        <p className="text-sm text-[#4e4f4d] mt-2">
          Live view of all accounts moving through the sourcing pipeline
        </p>
      </div>

      {/* Toolbar row */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] text-[#A3A3A3] font-[var(--font-fore-mono)] uppercase tracking-[0.12em]">
          {cards.length} run{cards.length !== 1 ? 's' : ''}
          {cards.some((c) => c.status === 'running') && (
            <span className="ml-2 text-[#075056]">· polling every 4s</span>
          )}
        </span>
        <button
          onClick={fetchPipeline}
          className="text-[10px] text-[#075056] hover:text-[#053d41] uppercase tracking-[0.1em] font-semibold font-[var(--font-fore-mono)] transition-colors duration-100 cursor-pointer"
        >
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="border-l-4 border-[#ce4100] pl-4 py-3 text-sm text-[#ce4100] mb-6">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p className="text-sm text-[#4e4f4d]">Loading…</p>
      )}

      {/* Kanban board */}
      {!loading && (
        <div className="flex gap-4 overflow-x-auto pb-6">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              column={col}
              cards={columnCards[col.key]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
