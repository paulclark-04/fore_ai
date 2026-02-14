const TIERS = [
  { key: 'A', label: 'Tier A', desc: 'Direct buyer', color: 'bg-green-50 border-green-200 text-green-700', badge: 'bg-green-500' },
  { key: 'B', label: 'Tier B', desc: 'Strong interest', color: 'bg-yellow-50 border-yellow-200 text-yellow-700', badge: 'bg-yellow-500' },
  { key: 'C', label: 'Tier C', desc: 'Unclear fit', color: 'bg-orange-50 border-orange-200 text-orange-700', badge: 'bg-orange-500' },
  { key: 'D', label: 'Tier D', desc: 'Not relevant', color: 'bg-red-50 border-red-200 text-red-700', badge: 'bg-red-500' },
];

export default function SummaryCards({ summary }) {
  if (!summary) return null;

  const actionable = (summary.A || 0) + (summary.B || 0);
  const total = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TIERS.map(({ key, label, desc, color, badge }) => (
          <div key={key} className={`rounded-xl border p-4 ${color}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{label}</span>
              <span className={`${badge} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
                {summary[key] || 0}
              </span>
            </div>
            <p className="text-xs opacity-70 mt-1">{desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Actionable Leads (A+B)</p>
          <p className="text-xs text-blue-500">{total} total leads scored</p>
        </div>
        <span className="text-3xl font-bold text-blue-600">{actionable}</span>
      </div>
    </div>
  );
}
