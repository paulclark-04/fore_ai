import { useState, useCallback } from 'react';
import SearchForm from './components/SearchForm';
import PipelineProgress from './components/PipelineProgress';
import SummaryCards from './components/SummaryCards';
import ResultsTable from './components/ResultsTable';
import ExportButtons from './components/ExportButtons';
import { startSearch, subscribeEvents, getResults } from './api';

function App() {
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
          // Fetch full results
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Fore AI</h1>
            <p className="text-xs text-gray-500">Lead Scoring Pipeline</p>
          </div>
          {results.length > 0 && <ExportButtons runId={runId} />}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <SearchForm onSearch={handleSearch} isRunning={isRunning} />

        {(isRunning || currentEvent) && (
          <PipelineProgress currentEvent={currentEvent} />
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {summary && <SummaryCards summary={summary} />}

        {results.length > 0 && <ResultsTable results={results} />}
      </main>
    </div>
  );
}

export default App;
