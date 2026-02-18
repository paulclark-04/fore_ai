import { useState, useEffect } from 'react';
import { getDashboardStats } from '../api';
import Badge from '../components/ui/Badge';

const TIERS = [
  { key: 'A', label: 'Tier A', desc: 'Direct buyer' },
  { key: 'B', label: 'Tier B', desc: 'Strong interest' },
  { key: 'C', label: 'Tier C', desc: 'Unclear fit' },
  { key: 'D', label: 'Tier D', desc: 'Not relevant' },
];

export default function DashboardPage({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-5xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter leading-none mb-10">
          Dashboard
        </h1>
        <p className="text-sm text-[#4e4f4d]">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-5xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter leading-none mb-10">
          Dashboard
        </h1>
        <div className="border-l-4 border-[#ce4100] pl-4 py-3 text-sm text-[#ce4100] font-medium">
          {error}
        </div>
      </div>
    );
  }

  const isEmpty = !stats || stats.total_runs === 0;

  if (isEmpty) {
    return (
      <div>
        <h1 className="text-5xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter leading-none mb-10">
          Dashboard
        </h1>
        <div className="border-t-2 border-[#075056] pt-8 pb-12 text-center">
          <p className="text-lg text-[#4e4f4d] mb-2">No pipeline runs yet</p>
          <p className="text-sm text-[#A3A3A3] mb-6">
            Run your first search to see dashboard metrics here
          </p>
          <button
            onClick={() => onNavigate?.('search')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#075056] text-white text-sm font-medium uppercase tracking-[0.1em] font-[var(--font-fore-mono)] rounded-none hover:bg-[#075056]/90 transition-colors duration-100 cursor-pointer"
          >
            Go to Search &rarr;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-5xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter leading-none mb-10">
        Dashboard
      </h1>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-t-2 border-[#075056] mb-10">
        <div className="p-6 border-r border-[#E5E7EB]">
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)]">
            Total Leads
          </span>
          <p className="text-4xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter mt-1">
            {stats.total_leads}
          </p>
        </div>
        <div
          className="p-6 border-r border-[#E5E7EB] cursor-pointer hover:bg-[#F6F8F9] transition-colors duration-100"
          onClick={() => onNavigate?.('accounts')}
          title="View all accounts"
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)]">
            Accounts
          </span>
          <p className="text-4xl font-bold text-[#075056] font-[var(--font-fore-heading)] tracking-tighter mt-1">
            {stats.unique_domains_count ?? (Array.isArray(stats.unique_domains) ? stats.unique_domains.length : stats.unique_domains)}
          </p>
          <span className="text-[10px] text-[#075056] font-[var(--font-fore-mono)] mt-1 inline-block">
            View all &rarr;
          </span>
        </div>
        <div className="p-6 border-r border-[#E5E7EB]">
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)]">
            Pipeline Runs
          </span>
          <p className="text-4xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter mt-1">
            {stats.total_runs}
          </p>
        </div>
        <div className="p-6">
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)]">
            Total Cost
          </span>
          <p className="text-4xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter mt-1">
            ${stats.total_cost?.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Tier Breakdown */}
      <div className="mb-10">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)] mb-4">
          Tier Breakdown
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-t-2 border-[#075056]">
          {TIERS.map(({ key, label, desc }, i) => (
            <div
              key={key}
              className={`p-6 ${i < TIERS.length - 1 ? 'border-r border-[#E5E7EB]' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)]">
                  {label}
                </span>
                <Badge tier={key}>{stats.tier_breakdown?.[key] || 0}</Badge>
              </div>
              <p className="text-xs text-[#A3A3A3]">{desc}</p>
            </div>
          ))}
        </div>
        {/* Actionable leads bar */}
        <div className="bg-[#075056] text-white p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] font-[var(--font-fore-mono)]">
              Actionable Leads (A+B)
            </p>
            <p className="text-[10px] text-white/50 mt-1 font-[var(--font-fore-mono)]">
              {stats.total_leads} total leads scored
            </p>
          </div>
          <span className="text-5xl font-bold font-[var(--font-fore-heading)] tracking-tighter">
            {(stats.tier_breakdown?.A || 0) + (stats.tier_breakdown?.B || 0)}
          </span>
        </div>
      </div>

      {/* Recent Runs */}
      {stats.recent_runs && stats.recent_runs.length > 0 && (
        <div className="mb-10">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)] mb-4">
            Recent Runs
          </h2>
          <div className="border-t-2 border-[#075056] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">
                    Domains
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">
                    Leads
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {stats.recent_runs.map((run) => (
                  <tr key={run.run_id} className="bg-white hover:bg-[#F6F8F9] transition-colors duration-100">
                    <td className="px-4 py-3 text-[#4e4f4d] whitespace-nowrap">
                      {run.created_at ? new Date(run.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-black font-medium">
                      {Array.isArray(run.domains) ? run.domains.join(', ') : (run.domains || '\u2014')}
                    </td>
                    <td className="px-4 py-3 font-bold text-black font-[var(--font-fore-heading)] text-lg tracking-tighter">
                      {run.total_results}
                    </td>
                    <td className="px-4 py-3 text-[#4e4f4d] font-[var(--font-fore-mono)]">
                      {run.cost_total ? `$${run.cost_total.toFixed(2)}` : '\u2014'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={run.status === 'done' ? 'success' : run.status === 'error' ? 'error' : 'neutral'}>
                        {run.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Personas */}
      {stats.persona_stats && stats.persona_stats.length > 0 && (
        <div>
          <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)] mb-4">
            Top Personas
          </h2>
          <div className="border-t-2 border-[#075056]">
            {stats.persona_stats.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]"
              >
                <span className="text-sm text-black">{p.label}</span>
                <span className="text-lg font-bold text-black font-[var(--font-fore-heading)] tracking-tighter">
                  {p.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
