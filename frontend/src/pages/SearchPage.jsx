import SearchForm from '../components/SearchForm';
import RunCard from '../components/RunCard';
import SummaryCards from '../components/SummaryCards';
import ResultsTable from '../components/ResultsTable';

export default function SearchPage({ runs, onSearch, onClearRuns }) {
  const runEntries = Object.entries(runs);
  const anyRunning = runEntries.some(([, r]) => r.isRunning);

  // Combined results from all completed runs, sorted by score desc
  const allResults = runEntries
    .flatMap(([, r]) => r.results)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Combined summary across all runs that have scoring enabled
  const combinedSummary = runEntries.reduce((acc, [, r]) => {
    if (!r.event?.summary) return acc;
    const s = r.event.summary;
    acc.A = (acc.A || 0) + (s.A || 0);
    acc.B = (acc.B || 0) + (s.B || 0);
    acc.C = (acc.C || 0) + (s.C || 0);
    acc.D = (acc.D || 0) + (s.D || 0);
    return acc;
  }, null);

  const allDone = runEntries.length > 0 && runEntries.every(([, r]) => !r.isRunning);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-10">
        <div>
          <h1 className="text-5xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter leading-none">
            Search
          </h1>
          <p className="text-sm text-[#4e4f4d] mt-2">
            Search, enrich, and score leads from target companies
          </p>
        </div>
      </div>

      <SearchForm onSearch={onSearch} isRunning={anyRunning} />

      {/* Run cards — one per account */}
      {runEntries.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)]">
              Pipeline Runs
            </h2>
            {allDone && (
              <button
                onClick={onClearRuns}
                className="text-[10px] uppercase tracking-[0.1em] text-[#A3A3A3] hover:text-[#ce4100] font-[var(--font-fore-mono)] transition-colors duration-100 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {runEntries.map(([runId, run]) => (
              <RunCard
                key={runId}
                runId={runId}
                domain={run.domain}
                event={run.event}
                isRunning={run.isRunning}
                results={run.results}
                error={run.error}
              />
            ))}
          </div>
        </div>
      )}

      {/* Combined summary (only when scoring was enabled) */}
      {combinedSummary && <SummaryCards summary={combinedSummary} />}

      {/* Combined results table */}
      {allResults.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-3xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter">
              Results
            </h2>
            <span className="text-[10px] text-[#4e4f4d] font-[var(--font-fore-mono)] uppercase tracking-[0.1em]">
              {allResults.length} leads
            </span>
          </div>
          <ResultsTable results={allResults} />
        </div>
      )}
    </div>
  );
}
