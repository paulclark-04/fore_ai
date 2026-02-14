import { useState } from 'react';
import LeadDetail from './LeadDetail';

const TIER_STYLES = {
  A: 'bg-green-50 text-green-700 border-green-200',
  B: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  C: 'bg-orange-50 text-orange-700 border-orange-200',
  D: 'bg-red-50 text-red-700 border-red-200',
};

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
    if (sortKey !== col) return <span className="text-gray-300 ml-1">&#8597;</span>;
    return <span className="text-blue-500 ml-1">{sortAsc ? '\u2191' : '\u2193'}</span>;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {[
                { key: 'first_name', label: 'Name' },
                { key: 'headline', label: 'Headline' },
                { key: 'company', label: 'Company' },
                { key: 'score', label: 'Score' },
                { key: 'tier', label: 'Tier' },
                { key: 'category', label: 'Category' },
                { key: 'email', label: 'Email' },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                >
                  {label}
                  <SortIcon col={key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((lead, idx) => (
              <>
                <tr
                  key={idx}
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  className={`border-b border-gray-100 cursor-pointer transition-colors ${
                    expandedIdx === idx ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {lead.first_name} {lead.last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[250px] truncate">{lead.headline}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{lead.company}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{lead.score}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${TIER_STYLES[lead.tier] || TIER_STYLES.D}`}>
                      {lead.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{lead.category}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {lead.email ? (
                      <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {lead.email}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
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
