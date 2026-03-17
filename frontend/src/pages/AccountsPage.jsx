import { useState, useEffect, useMemo } from 'react';
import { getAccounts, getAccountLeads, getAccountExportUrl, updateAccountVertical } from '../api';
import Badge from '../components/ui/Badge';

const TIER_KEYS = ['A', 'B', 'C', 'D'];
const VERTICALS = ['banking', 'insurance', 'media', 'ecommerce', 'travel'];
const VERTICAL_LABELS = {
  banking: 'Banking',
  insurance: 'Insurance',
  media: 'Media',
  ecommerce: 'E-commerce',
  travel: 'Travel',
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState('domain');
  const [sortAsc, setSortAsc] = useState(true);

  // Detail view state
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState(null);
  const [tierFilter, setTierFilter] = useState(null);
  const [enrichedFilter, setEnrichedFilter] = useState(null);
  const [expandedLeadIdx, setExpandedLeadIdx] = useState(null);

  // Vertical filter for list view
  const [verticalFilter, setVerticalFilter] = useState(null);

  // Fetch accounts list
  useEffect(() => {
    getAccounts()
      .then(setAccounts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Fetch leads when domain or filters change
  useEffect(() => {
    if (!selectedDomain) return;
    setLeadsLoading(true);
    setLeadsError(null);
    setExpandedLeadIdx(null);
    const filters = {};
    if (tierFilter) filters.tier = tierFilter;
    if (enrichedFilter !== null) filters.enriched = enrichedFilter;
    getAccountLeads(selectedDomain, filters)
      .then(setLeads)
      .catch((e) => setLeadsError(e.message))
      .finally(() => setLeadsLoading(false));
  }, [selectedDomain, tierFilter, enrichedFilter]);

  // Filter + sort accounts
  const sortedAccounts = useMemo(() => {
    let filtered = accounts;
    if (verticalFilter) {
      filtered = accounts.filter((a) => a.vertical === verticalFilter);
    }
    const sorted = [...filtered].sort((a, b) => {
      if (sortField === 'domain') {
        return sortAsc
          ? a.domain.localeCompare(b.domain)
          : b.domain.localeCompare(a.domain);
      }
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [accounts, sortField, sortAsc, verticalFilter]);

  const handleSetVertical = async (domain, vertical) => {
    try {
      await updateAccountVertical(domain, vertical || null);
      setAccounts((prev) =>
        prev.map((a) => (a.domain === domain ? { ...a, vertical: vertical || null } : a))
      );
    } catch (err) {
      console.error('Failed to update vertical:', err);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'domain');
    }
  };

  const handleSelectDomain = (domain) => {
    setSelectedDomain(domain);
    setTierFilter(null);
    setEnrichedFilter(null);
    setExpandedLeadIdx(null);
  };

  const handleBack = () => {
    setSelectedDomain(null);
    setLeads([]);
    setTierFilter(null);
    setEnrichedFilter(null);
    setExpandedLeadIdx(null);
  };

  // Sorting indicator
  const SortArrow = ({ field }) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1 text-[#075056]">{sortAsc ? '\u2191' : '\u2193'}</span>
    );
  };

  // -- LOADING --
  if (loading) {
    return (
      <div>
        <h1 className="text-5xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter leading-none mb-10">
          Accounts
        </h1>
        <p className="text-sm text-[#4e4f4d]">Loading...</p>
      </div>
    );
  }

  // -- ERROR --
  if (error) {
    return (
      <div>
        <h1 className="text-5xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter leading-none mb-10">
          Accounts
        </h1>
        <div className="border-l-4 border-[#ce4100] pl-4 py-3 text-sm text-[#ce4100] font-medium">
          {error}
        </div>
      </div>
    );
  }

  // -- DETAIL VIEW --
  if (selectedDomain) {
    return (
      <div>
        {/* Back button + domain header */}
        <button
          onClick={handleBack}
          className="text-sm text-[#4e4f4d] hover:text-[#075056] mb-4 flex items-center gap-2 transition-colors duration-100 cursor-pointer uppercase tracking-[0.1em] font-[var(--font-fore-mono)] font-medium text-[11px]"
        >
          <span>&larr;</span> Back to Accounts
        </button>
        <div className="flex items-end gap-6 mb-6">
          <h1 className="text-5xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter leading-none">
            {selectedDomain}
          </h1>
          <select
            value={accounts.find((a) => a.domain === selectedDomain)?.vertical || ''}
            onChange={async (e) => {
              const val = e.target.value || null;
              try {
                await updateAccountVertical(selectedDomain, val);
                setAccounts((prev) =>
                  prev.map((a) =>
                    a.domain === selectedDomain ? { ...a, vertical: val } : a
                  )
                );
              } catch (err) {
                console.error(err);
              }
            }}
            className="px-3 py-1.5 text-[11px] bg-transparent border-2 border-[#E5E7EB] text-[#4e4f4d] focus:border-[#075056] focus:outline-none appearance-none transition-all duration-100 rounded-none cursor-pointer font-[var(--font-fore-mono)] uppercase tracking-[0.1em]"
          >
            <option value="">No vertical</option>
            {VERTICALS.map((v) => (
              <option key={v} value={v}>{VERTICAL_LABELS[v]}</option>
            ))}
          </select>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {/* Tier toggles */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)] mr-1">
              Tier
            </span>
            {TIER_KEYS.map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(tierFilter === t ? null : t)}
                className={`px-4 py-2 text-[10px] border-2 transition-colors duration-100 cursor-pointer uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] rounded-none ${
                  tierFilter === t
                    ? 'bg-[#075056] border-[#075056] text-white'
                    : 'bg-white border-[#E5E7EB] text-[#4e4f4d] hover:border-[#075056] hover:text-[#075056]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Enriched toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)] mr-1">
              Enriched
            </span>
            {[
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() =>
                  setEnrichedFilter(enrichedFilter === value ? null : value)
                }
                className={`px-4 py-2 text-[10px] border-2 transition-colors duration-100 cursor-pointer uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] rounded-none ${
                  enrichedFilter === value
                    ? 'bg-[#075056] border-[#075056] text-white'
                    : 'bg-white border-[#E5E7EB] text-[#4e4f4d] hover:border-[#075056] hover:text-[#075056]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Active filter count */}
          {(tierFilter || enrichedFilter) && (
            <button
              onClick={() => {
                setTierFilter(null);
                setEnrichedFilter(null);
              }}
              className="text-[10px] text-[#ce4100] hover:text-[#ce4100]/80 uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] cursor-pointer transition-colors duration-100"
            >
              Clear filters
            </button>
          )}

          {/* Download XLSX */}
          <a
            href={getAccountExportUrl(selectedDomain, {
              tier: tierFilter,
              enriched: enrichedFilter,
            })}
            download
            className="ml-auto px-5 py-2 text-[10px] border-2 border-[#075056] bg-[#075056] text-white uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] hover:bg-[#053d41] transition-colors duration-100 cursor-pointer inline-flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download XLSX
          </a>
        </div>

        {/* Leads table */}
        {leadsLoading ? (
          <p className="text-sm text-[#4e4f4d]">Loading leads...</p>
        ) : leadsError ? (
          <div className="border-l-4 border-[#ce4100] pl-4 py-3 text-sm text-[#ce4100] font-medium">
            {leadsError}
          </div>
        ) : leads.length === 0 ? (
          <div className="border-t-2 border-[#075056] pt-8 pb-12 text-center">
            <p className="text-lg text-[#4e4f4d] mb-2">No leads found</p>
            <p className="text-sm text-[#A3A3A3]">
              {tierFilter || enrichedFilter
                ? 'Try adjusting your filters'
                : 'No leads have been sourced for this account yet'}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-[#A3A3A3] font-[var(--font-fore-mono)] mb-3">
              {leads.length} lead{leads.length !== 1 ? 's' : ''}
            </p>
            <div className="border-t-2 border-[#075056] overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">
                      Name
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">
                      Title
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">
                      Company
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">
                      Score
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">
                      Tier
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">
                      Enriched
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {leads.map((lead, idx) => (
                    <tr key={idx}>
                      <td colSpan={6} className="p-0">
                        {/* Lead row */}
                        <div
                          onClick={() =>
                            setExpandedLeadIdx(expandedLeadIdx === idx ? null : idx)
                          }
                          className={`grid grid-cols-6 cursor-pointer transition-colors duration-100 items-center ${
                            expandedLeadIdx === idx
                              ? 'bg-[#F6F8F9]'
                              : 'bg-white hover:bg-[#F6F8F9]'
                          }`}
                        >
                          <div className="px-4 py-3 text-center text-black font-medium">
                            {lead.first_name} {lead.last_name}
                            {lead.linkedin_url && (
                              <a
                                href={lead.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="ml-2 text-[#075056] hover:underline text-xs font-[var(--font-fore-mono)]"
                              >
                                LI
                              </a>
                            )}
                          </div>
                          <div className="px-4 py-3 text-center text-[#4e4f4d] truncate" title={lead.job_title || lead.headline}>
                            {lead.job_title || lead.headline || '\u2014'}
                          </div>
                          <div className="px-4 py-3 text-center text-[#4e4f4d]">
                            {lead.company || '\u2014'}
                          </div>
                          <div className="px-4 py-3 text-center font-bold text-black font-[var(--font-fore-heading)] text-lg tracking-tighter">
                            {lead.score}
                          </div>
                          <div className="px-4 py-3 text-center">
                            {lead.tier ? <Badge tier={lead.tier}>{lead.tier}</Badge> : '\u2014'}
                          </div>
                          <div className="px-4 py-3 text-center">
                            {lead.enriched ? (
                              <Badge status="success">Enriched</Badge>
                            ) : (
                              <Badge status="neutral">Basic</Badge>
                            )}
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {expandedLeadIdx === idx && (
                          <div className="bg-[#F6F8F9] border-t border-[#E5E7EB] px-6 py-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Left column */}
                              <div className="space-y-4">
                                {lead.headline && (
                                  <div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)]">
                                      Headline
                                    </span>
                                    <p className="text-sm text-black mt-1">{lead.headline}</p>
                                  </div>
                                )}
                                {lead.persona_label && (
                                  <div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)]">
                                      Persona
                                    </span>
                                    <p className="text-sm text-black mt-1">{lead.persona_label}</p>
                                  </div>
                                )}
                                {lead.category && (
                                  <div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)]">
                                      Category
                                    </span>
                                    <p className="text-sm text-black mt-1">{lead.category}</p>
                                  </div>
                                )}
                                {lead.seniority_level && (
                                  <div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)]">
                                      Seniority
                                    </span>
                                    <p className="text-sm text-black mt-1">{lead.seniority_level}</p>
                                  </div>
                                )}
                                {lead.country && (
                                  <div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)]">
                                      Country
                                    </span>
                                    <p className="text-sm text-black mt-1">{lead.country}</p>
                                  </div>
                                )}
                                {lead.method && (
                                  <div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)]">
                                      Method
                                    </span>
                                    <p className="text-sm text-black mt-1">{lead.method}</p>
                                  </div>
                                )}
                              </div>

                              {/* Right column */}
                              <div className="space-y-4">
                                {lead.reasoning && (
                                  <div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)]">
                                      Reasoning
                                    </span>
                                    <p className="text-sm text-black mt-1 whitespace-pre-wrap">{lead.reasoning}</p>
                                  </div>
                                )}
                                {lead.red_flags && (
                                  <div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#ce4100] font-[var(--font-fore-mono)]">
                                      Red Flags
                                    </span>
                                    <p className="text-sm text-[#ce4100] mt-1">{lead.red_flags}</p>
                                  </div>
                                )}
                                {lead.outreach_angle && (
                                  <div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)]">
                                      Outreach Angle
                                    </span>
                                    <p className="text-sm text-black mt-1">{lead.outreach_angle}</p>
                                  </div>
                                )}
                                {lead.email && (
                                  <div>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)]">
                                      Email
                                    </span>
                                    <p className="text-sm text-black mt-1">
                                      <a href={`mailto:${lead.email}`} className="text-[#075056] hover:underline">
                                        {lead.email}
                                      </a>
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -- ACCOUNTS LIST VIEW --
  return (
    <div>
      <h1 className="text-5xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter leading-none mb-2">
        Accounts
      </h1>
      <p className="text-sm text-[#4e4f4d] mb-10">
        {accounts.length} account{accounts.length !== 1 ? 's' : ''} sourced
      </p>

      {/* Vertical filter toggles */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)] mr-1">
          Vertical
        </span>
        {VERTICALS.map((v) => (
          <button
            key={v}
            onClick={() => setVerticalFilter(verticalFilter === v ? null : v)}
            className={`px-4 py-2 text-[10px] border-2 transition-colors duration-100 cursor-pointer uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] rounded-none ${
              verticalFilter === v
                ? 'bg-[#075056] border-[#075056] text-white'
                : 'bg-white border-[#E5E7EB] text-[#4e4f4d] hover:border-[#075056] hover:text-[#075056]'
            }`}
          >
            {VERTICAL_LABELS[v]}
          </button>
        ))}
        {verticalFilter && (
          <button
            onClick={() => setVerticalFilter(null)}
            className="text-[10px] text-[#ce4100] hover:text-[#ce4100]/80 uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] cursor-pointer transition-colors duration-100 ml-2"
          >
            Clear
          </button>
        )}
      </div>

      {sortedAccounts.length === 0 ? (
        <div className="border-t-2 border-[#075056] pt-8 pb-12 text-center">
          <p className="text-lg text-[#4e4f4d] mb-2">
            {verticalFilter ? 'No accounts match this vertical' : 'No accounts yet'}
          </p>
          <p className="text-sm text-[#A3A3A3]">
            {verticalFilter
              ? 'Try a different vertical or clear the filter'
              : 'Run a search to start sourcing leads by company domain'}
          </p>
        </div>
      ) : (
        <div className="border-t-2 border-[#075056] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th
                  className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d] cursor-pointer hover:text-[#075056] transition-colors duration-100 select-none"
                  onClick={() => handleSort('domain')}
                >
                  Domain
                  <SortArrow field="domain" />
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">
                  Vertical
                </th>
                <th
                  className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d] cursor-pointer hover:text-[#075056] transition-colors duration-100 select-none"
                  onClick={() => handleSort('total_leads')}
                >
                  Leads
                  <SortArrow field="total_leads" />
                </th>
                <th
                  className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d] cursor-pointer hover:text-[#075056] transition-colors duration-100 select-none"
                  onClick={() => handleSort('total_runs')}
                >
                  Runs
                  <SortArrow field="total_runs" />
                </th>
                {TIER_KEYS.map((t) => (
                  <th
                    key={t}
                    className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]"
                  >
                    {t}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.15em] font-[var(--font-fore-mono)] text-[#4e4f4d]">
                  Last Run
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {sortedAccounts.map((acct) => (
                <tr
                  key={acct.domain}
                  onClick={() => handleSelectDomain(acct.domain)}
                  className="bg-white hover:bg-[#F6F8F9] transition-colors duration-100 cursor-pointer"
                >
                  <td className="px-4 py-3 text-center text-black font-medium">
                    {acct.domain}
                  </td>
                  <td
                    className="px-4 py-3 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      value={acct.vertical || ''}
                      onChange={(e) => handleSetVertical(acct.domain, e.target.value)}
                      className={`text-[10px] bg-transparent appearance-none px-2 py-1 cursor-pointer font-[var(--font-fore-mono)] uppercase tracking-[0.08em] rounded-none border transition-colors duration-100 ${
                        acct.vertical
                          ? 'border-[#075056] text-[#075056]'
                          : 'border-[#E5E7EB] text-[#A3A3A3]'
                      }`}
                    >
                      <option value="">— None —</option>
                      {VERTICALS.map((v) => (
                        <option key={v} value={v}>{VERTICAL_LABELS[v]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-black font-[var(--font-fore-heading)] text-lg tracking-tighter">
                    {acct.total_leads}
                  </td>
                  <td className="px-4 py-3 text-center text-[#4e4f4d]">
                    {acct.total_runs}
                  </td>
                  {TIER_KEYS.map((t) => {
                    const count = acct[`tier_${t.toLowerCase()}`] || 0;
                    return (
                      <td key={t} className="px-4 py-3 text-center">
                        {count > 0 ? (
                          <Badge tier={t}>{count}</Badge>
                        ) : (
                          <span className="text-[#A3A3A3] text-xs">\u2014</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center text-[#4e4f4d] whitespace-nowrap">
                    {acct.last_run_date
                      ? new Date(acct.last_run_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '\u2014'}
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
