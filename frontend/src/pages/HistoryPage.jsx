import { useState, useEffect } from 'react';
import { getRunsList, getHistoricalRun } from '../api';
import Badge from '../components/ui/Badge';
import ResultsTable from '../components/ResultsTable';

export default function HistoryPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRunId, setExpandedRunId] = useState(null);
  const [expandedResults, setExpandedResults] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    getRunsList()
      .then(setRuns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleExpandRun = async (runId) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      setExpandedResults(null);
      return;
    }

    setExpandedRunId(runId);
    setExpandedResults(null);
    setLoadingResults(true);

    try {
      const data = await getHistoricalRun(runId);
      setExpandedResults(data.results || []);
    } catch (e) {
      setExpandedResults([]);
    } finally {
      setLoadingResults(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-5xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter leading-none mb-10">
          History
        </h1>
        <p className="text-sm text-[#4e4f4d]">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-5xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter leading-none mb-10">
        History
      </h1>

      {error && (
        <div className="border-l-4 border-[#ce4100] pl-4 py-3 text-sm text-[#ce4100] font-medium mb-8">
          {error}
        </div>
      )}

      {runs.length === 0 ? (
        <div className="border-t-2 border-[#075056] pt-8 pb-12 text-center">
          <p className="text-lg text-[#4e4f4d] mb-2">No runs yet</p>
          <p className="text-sm text-[#A3A3A3]">
            Completed pipeline runs will appear here
          </p>
        </div>
      ) : (
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
                  Tiers
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
              {runs.map((run) => (
                <tr key={run.run_id}>
                  <td colSpan={6} className="p-0">
                    <div
                      onClick={() => handleExpandRun(run.run_id)}
                      className={`grid grid-cols-6 cursor-pointer transition-colors duration-100 ${
                        expandedRunId === run.run_id
                          ? 'bg-[#F6F8F9]'
                          : 'bg-white hover:bg-[#F6F8F9]'
                      }`}
                    >
                      <div className="px-4 py-3 text-[#4e4f4d] whitespace-nowrap">
                        {run.created_at
                          ? new Date(run.created_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '\u2014'}
                      </div>
                      <div className="px-4 py-3 text-black font-medium truncate">
                        {run.domains || '\u2014'}
                      </div>
                      <div className="px-4 py-3 font-bold text-black font-[var(--font-fore-heading)] text-lg tracking-tighter">
                        {run.total_leads}
                      </div>
                      <div className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {['A', 'B', 'C', 'D'].map((tier) => {
                            const count = run[`tier_${tier.toLowerCase()}`] || 0;
                            return count > 0 ? (
                              <Badge key={tier} tier={tier}>{count}</Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                      <div className="px-4 py-3 text-[#4e4f4d]">
                        ${run.total_cost?.toFixed(3) || '0.000'}
                      </div>
                      <div className="px-4 py-3">
                        <Badge
                          status={
                            run.status === 'done'
                              ? 'success'
                              : run.status === 'error'
                              ? 'error'
                              : 'neutral'
                          }
                        >
                          {run.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Expanded results */}
                    {expandedRunId === run.run_id && (
                      <div className="bg-[#F6F8F9] border-t border-[#E5E7EB] px-4 py-4">
                        {loadingResults ? (
                          <p className="text-sm text-[#4e4f4d]">Loading results...</p>
                        ) : expandedResults && expandedResults.length > 0 ? (
                          <ResultsTable results={expandedResults} />
                        ) : (
                          <p className="text-sm text-[#A3A3A3]">No lead data stored for this run</p>
                        )}
                      </div>
                    )}
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
