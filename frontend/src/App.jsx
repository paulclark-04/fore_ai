import { useState } from 'react';
import Sidebar from './components/ui/Sidebar';
import SearchPage from './pages/SearchPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import PersonasPage from './pages/PersonasPage';

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

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'search':
        return <SearchPage />;
      case 'history':
        return <HistoryPage />;
      case 'personas':
        return <PersonasPage />;
      default:
        return <SearchPage />;
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
