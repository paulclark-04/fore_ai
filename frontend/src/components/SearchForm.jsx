import { useState } from 'react';

const SENIORITY_OPTIONS = [
  { value: 'c_suite', label: 'C-Suite' },
  { value: 'vp', label: 'VP' },
  { value: 'director', label: 'Director' },
  { value: 'head', label: 'Head' },
  { value: 'manager', label: 'Manager' },
  { value: 'senior', label: 'Senior' },
];

const EMAIL_STATUS_OPTIONS = [
  { value: 'validated', label: 'Validated' },
  { value: 'not_validated', label: 'Not Validated' },
  { value: 'unknown', label: 'Unknown' },
];

export default function SearchForm({ onSearch, isRunning }) {
  const [companyDomain, setCompanyDomain] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [titleKeywords, setTitleKeywords] = useState('');
  const [seniorities, setSeniorities] = useState(['c_suite', 'vp', 'director']);
  const [location, setLocation] = useState('france');
  const [emailStatus, setEmailStatus] = useState(['validated']);
  const [fetchCount, setFetchCount] = useState(100);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!companyDomain.trim()) return;

    const params = {
      company_domain: companyDomain.split(',').map((d) => d.trim()).filter(Boolean),
      fetch_count: fetchCount,
    };

    if (titleKeywords.trim()) {
      params.job_titles = titleKeywords.split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (seniorities.length > 0) {
      params.seniority_levels = seniorities;
    }
    if (location.trim()) {
      params.location = location.split(',').map((l) => l.trim()).filter(Boolean);
    }
    if (emailStatus.length > 0) {
      params.email_status = emailStatus;
    }

    onSearch(params);
  };

  const toggleSeniority = (val) => {
    setSeniorities((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  };

  const toggleEmailStatus = (val) => {
    setEmailStatus((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company Domain(s) <span className="text-gray-400 font-normal">(comma-separated for multiple)</span>
        </label>
        <input
          type="text"
          value={companyDomain}
          onChange={(e) => setCompanyDomain(e.target.value)}
          placeholder="e.g. airbus.com, credit-agricole.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          required
        />
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1"
      >
        <span className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>&#9654;</span>
        Advanced Filters
      </button>

      {showAdvanced && (
        <div className="space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title Keywords <span className="text-gray-400 font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={titleKeywords}
              onChange={(e) => setTitleKeywords(e.target.value)}
              placeholder="e.g. qa, devops, cto, engineering, test"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Seniority Levels</label>
            <div className="flex flex-wrap gap-2">
              {SENIORITY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleSeniority(value)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    seniorities.includes(value)
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location <span className="text-gray-400 font-normal">(region/country/state)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. france"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Status</label>
            <div className="flex flex-wrap gap-2">
              {EMAIL_STATUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleEmailStatus(value)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    emailStatus.includes(value)
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Leads: <span className="text-blue-600">{fetchCount}</span>
            </label>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={fetchCount}
              onChange={(e) => setFetchCount(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>10</span>
              <span>500</span>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isRunning || !companyDomain.trim()}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isRunning ? 'Pipeline Running...' : 'Search & Score'}
      </button>
    </form>
  );
}
