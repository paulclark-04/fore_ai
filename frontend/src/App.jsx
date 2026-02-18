import { useState, useCallback } from 'react';
import Sidebar from './components/ui/Sidebar';
import SearchPage from './pages/SearchPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import PersonasPage from './pages/PersonasPage';
import AccountsPage from './pages/AccountsPage';
import { startSearch, subscribeEvents, getResults } from './api';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="6" height="6" />
        <rect x="9" y="1" width="6" height="6" />
        <rect x="1" y="9" width="6" height="6" />
        <rect x="9" y="9" width="6" height="6" />
      </svg>
    ),
  },
  {
    id: 'search',
    label: 'Search',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7" cy="7" r="5" />
        <line x1="11" y1="11" x2="15" y2="15" />
      </svg>
    ),
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="12" height="12" rx="1" />
        <line x1="2" y1="6" x2="14" y2="6" />
        <line x1="6" y1="6" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'History',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6.5" />
        <polyline points="8,4 8,8 11,10" />
      </svg>
    ),
  },
  {
    id: 'personas',
    label: 'Personas',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="5" r="3" />
        <path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      </svg>
    ),
  },
];

function App() {
  const [currentPage, setCurrentPage] = useState('search');

  // Search state — lifted here so it persists across navigation
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

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'search':
        return (
          <SearchPage
            isRunning={isRunning}
            runId={runId}
            currentEvent={currentEvent}
            summary={summary}
            results={results}
            error={error}
            onSearch={handleSearch}
          />
        );
      case 'accounts':
        return <AccountsPage />;
      case 'history':
        return <HistoryPage />;
      case 'personas':
        return <PersonasPage />;
      default:
        return (
          <SearchPage
            isRunning={isRunning}
            runId={runId}
            currentEvent={currentEvent}
            summary={summary}
            results={results}
            error={error}
            onSearch={handleSearch}
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        items={NAV_ITEMS}
        activeItem={currentPage}
        onItemClick={setCurrentPage}
      />
      <main className="flex-1 max-w-[1100px] px-10 py-10">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
