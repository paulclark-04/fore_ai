import Badge from './ui/Badge';

const TIERS = [
  { key: 'A', label: 'Tier A', desc: 'Direct buyer' },
  { key: 'B', label: 'Tier B', desc: 'Strong interest' },
  { key: 'C', label: 'Tier C', desc: 'Unclear fit' },
  { key: 'D', label: 'Tier D', desc: 'Not relevant' },
];

export default function SummaryCards({ summary }) {
  if (!summary) return null;

  const actionable = (summary.A || 0) + (summary.B || 0);
  const total = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <div className="py-8">
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
              <Badge tier={key}>{summary[key] || 0}</Badge>
            </div>
            <p className="text-xs text-[#A3A3A3]">{desc}</p>
          </div>
        ))}
      </div>

      {/* Actionable leads — inverted section */}
      <div className="bg-[#075056] text-white p-6 flex items-center justify-between mt-0">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] font-[var(--font-fore-mono)]">
            Actionable Leads (A+B)
          </p>
          <p className="text-[10px] text-white/50 mt-1 font-[var(--font-fore-mono)]">{total} total leads scored</p>
        </div>
        <span className="text-5xl font-bold font-[var(--font-fore-heading)] tracking-tighter">
          {actionable}
        </span>
      </div>
    </div>
  );
}
