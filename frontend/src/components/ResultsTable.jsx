import { useState } from 'react';
import LeadDetail from './LeadDetail';
import Badge from './ui/Badge';

export default function ResultsTable({ results }) {
  const [sortKey, setSortKey] = useState('score');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(null);

  if (!results || results.length === 0) return null;

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'first_name');
    }
  };

  const sorted = [...results].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span className="text-[#A3A3A3] ml-1">&#8597;</span>;
    return <span className="text-[#075056] ml-1">{sortAsc ? '\u2191' : '\u2193'}</span>;
  };

  const columns = [
    { key: 'first_name', label: 'Name' },
    { key: 'headline', label: 'Headline' },
    { key: 'company', label: 'Company' },
    { key: 'score', label: 'Score' },
    { key: 'tier', label: 'Tier' },
    { key: 'category', label: 'Category' },
    { key: 'email', label: 'Email' },
  ];

  return (
    <div className="border-t-2 border-[#075056] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB]">
              {columns.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] cursor-pointer hover:text-[#075056] select-none transition-colors duration-100 font-[var(--font-fore-mono)] text-[#4e4f4d]"
                >
                  {label}
                  <SortIcon col={key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {sorted.map((lead, idx) => (
              <>
                <tr
                  key={idx}
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  className={`transition-colors duration-100 cursor-pointer ${
                    expandedIdx === idx
                      ? 'bg-[#F6F8F9]'
                      : 'bg-white hover:bg-[#F6F8F9]'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-black whitespace-nowrap">
                    {lead.first_name} {lead.last_name}
                  </td>
                  <td className="px-4 py-3 text-[#4e4f4d] max-w-[250px] truncate">
                    {lead.headline}
                  </td>
                  <td className="px-4 py-3 text-[#4e4f4d] whitespace-nowrap">
                    {lead.company}
                  </td>
                  <td className="px-4 py-3 font-bold text-black font-[var(--font-fore-heading)] text-2xl tracking-tighter">
                    {lead.score}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tier={lead.tier || 'D'}>{lead.tier}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#4e4f4d] text-[10px] font-[var(--font-fore-mono)] uppercase tracking-[0.1em]">
                    {lead.category}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {lead.email ? (
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-[#075056] underline underline-offset-4 hover:no-underline transition-all duration-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lead.email}
                      </a>
                    ) : (
                      <span className="text-[#A3A3A3]">&mdash;</span>
                    )}
                  </td>
                </tr>
                {expandedIdx === idx && (
                  <tr key={`detail-${idx}`}>
                    <td colSpan={7} className="px-0 py-0">
                      <LeadDetail lead={lead} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
