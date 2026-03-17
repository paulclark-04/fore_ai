import { useState, useCallback } from 'react';
import Sidebar from './components/ui/Sidebar';
import SearchPage from './pages/SearchPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import PersonasPage from './pages/PersonasPage';
import AccountsPage from './pages/AccountsPage';
import WavesPage from './pages/WavesPage';
import PipelinePage from './pages/PipelinePage';
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
    id: 'waves',
    label: 'Waves',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M1 8 C3 5, 5 5, 7 8 S11 11, 13 8 S15 5, 15 8" strokeLinecap="round" />
        <path d="M1 11 C3 8, 5 8, 7 11 S11 14, 13 11" strokeLinecap="round" opacity="0.5" />
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
  {
    id: 'pipeline',
    label: 'Pipeline',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="4" width="3" height="8" rx="0.5" />
        <rect x="6" y="2" width="3" height="10" rx="0.5" />
        <rect x="11" y="5" width="3" height="7" rx="0.5" />
        <line x1="4" y1="8" x2="6" y2="8" />
        <line x1="9" y1="8" x2="11" y2="8" />
      </svg>
    ),
  },
];

function App() {
  const [currentPage, setCurrentPage] = useState('search');

  // Multi-run state — keyed by run_id
  const [runs, setRuns] = useState({});
  // { run_id: { domain, event, results, isRunning, error } }

  const handleSearch = useCallback(async (params) => {
    const domains = params.company_domain;

    for (const domain of domains) {
      const singleParams = { ...params, company_domain: [domain] };

      let run_id;
      try {
        const res = await startSearch(singleParams);
        run_id = res.run_id;
      } catch (e) {
        // Show a failed entry for this domain
        const fakeId = `err-${domain}-${Date.now()}`;
        setRuns((prev) => ({
          ...prev,
          [fakeId]: { domain, event: null, results: [], isRunning: false, error: `Failed to start: ${e.message}` },
        }));
        continue;
      }

      setRuns((prev) => ({
        ...prev,
        [run_id]: { domain, event: null, results: [], isRunning: true, error: null },
      }));

      subscribeEvents(run_id, async (event) => {
        setRuns((prev) => {
          const run = prev[run_id];
          if (!run) return prev;
          const updated = {
            ...run,
            event,
            isRunning: event.step !== 'done' && event.step !== 'error',
            error: event.step === 'error' ? event.message : run.error,
          };
          return { ...prev, [run_id]: updated };
        });

        if (event.step === 'done') {
          try {
            const data = await getResults(run_id);
            setRuns((prev) => ({
              ...prev,
              [run_id]: { ...prev[run_id], results: data.results || [] },
            }));
          } catch (e) {
            setRuns((prev) => ({
              ...prev,
              [run_id]: { ...prev[run_id], error: `Failed to fetch results: ${e.message}` },
            }));
          }
        }
      });
    }
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'search':
        return (
          <SearchPage
            runs={runs}
            onSearch={handleSearch}
            onClearRuns={() => setRuns({})}
          />
        );
      case 'accounts':
        return <AccountsPage />;
      case 'waves':
        return <WavesPage />;
      case 'history':
        return <HistoryPage />;
      case 'personas':
        return <PersonasPage />;
      case 'pipeline':
        return <PipelinePage />;
      default:
        return (
          <SearchPage
            runs={runs}
            onSearch={handleSearch}
            onClearRuns={() => setRuns({})}
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
