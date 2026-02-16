import { useState, useCallback } from 'react';
import SearchForm from '../components/SearchForm';
import PipelineProgress from '../components/PipelineProgress';
import SummaryCards from '../components/SummaryCards';
import ResultsTable from '../components/ResultsTable';
import ExportButtons from '../components/ExportButtons';
import { startSearch, subscribeEvents, getResults } from '../api';

export default function SearchPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [runId, setRunId] = useState(null);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [summary, setSummary] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleSearch = useCallback(async (params) => {
    setIsRunning(true);
    setCurrentEvent(null);
    setSummary(null);
    setResults([]);
    setError(null);

    try {
      const { run_id } = await startSearch(params);
      setRunId(run_id);

      subscribeEvents(run_id, async (event) => {
        setCurrentEvent(event);

        if (event.step === 'done' && event.summary) {
          setSummary(event.summary);
          try {
            const data = await getResults(run_id);
            setResults(data.results || []);
          } catch (e) {
            setError(`Failed to fetch results: ${e.message}`);
          }
          setIsRunning(false);
        }

        if (event.step === 'done' && !event.summary) {
          try {
            const data = await getResults(run_id);
            setResults(data.results || []);
          } catch (e) {
            setError(`Failed to fetch results: ${e.message}`);
          }
          setIsRunning(false);
        }

        if (event.step === 'error') {
          setError(event.message);
          setIsRunning(false);
        }
      });
    } catch (e) {
      setError(`Failed to start pipeline: ${e.message}`);
      setIsRunning(false);
    }
  }, []);

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
        {results.length > 0 && <ExportButtons runId={runId} />}
      </div>

      <SearchForm onSearch={handleSearch} isRunning={isRunning} />

      {(isRunning || currentEvent) && (
        <PipelineProgress currentEvent={currentEvent} />
      )}

      {error && (
        <div className="border-l-4 border-[#ce4100] pl-4 py-3 text-sm text-[#ce4100] font-medium my-8">
          {error}
        </div>
      )}

      {summary && <SummaryCards summary={summary} />}

      {results.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-3xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter">
              Results
            </h2>
            <span className="text-[10px] text-[#4e4f4d] font-[var(--font-fore-mono)] uppercase tracking-[0.1em]">
              {results.length} leads
            </span>
          </div>
          <ResultsTable results={results} />
        </div>
      )}
    </div>
  );
}
