import { useState, useEffect } from 'react';
import Button from './ui/Button';
import { Checkbox } from './ui/Input';

const SENIORITY_OPTIONS = [
  { value: 'c_suite', label: 'C-Suite' },
  { value: 'vp', label: 'VP' },
  { value: 'owner', label: 'Owner' },
  { value: 'partner', label: 'Partner' },
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
  const [domains, setDomains] = useState([]);
  const [domainInput, setDomainInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [titleKeywords, setTitleKeywords] = useState('');
  const [seniorities, setSeniorities] = useState(['c_suite', 'vp', 'director']);
  const [location, setLocation] = useState('france');
  const [emailStatus, setEmailStatus] = useState(['validated']);
  const [fetchCount, setFetchCount] = useState(100);
  const [enableScoring, setEnableScoring] = useState(false);
  const [vertical, setVertical] = useState('');

  // Persona presets
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState('');

  useEffect(() => {
    fetch('/api/personas')
      .then((r) => r.json())
      .then(setPersonas)
      .catch(() => {});
  }, []);

  const handlePersonaSelect = (personaId) => {
    setSelectedPersona(personaId);
    if (!personaId) return;
    const persona = personas.find((p) => p.id === personaId);
    if (persona) {
      setTitleKeywords(persona.job_titles.join(', '));
      if (persona.seniority_levels) setSeniorities(persona.seniority_levels);
      if (persona.location) setLocation(persona.location.join(', '));
      if (persona.email_status) setEmailStatus(persona.email_status);
      if (!showAdvanced) setShowAdvanced(true);
    }
  };

  const normalizeDomain = (val) => {
    let d = val.trim().toLowerCase().replace(/,/g, '');
    d = d.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
    return d;
  };

  const addDomain = (val) => {
    const cleaned = normalizeDomain(val);
    if (cleaned && !domains.includes(cleaned)) {
      setDomains((prev) => [...prev, cleaned]);
    }
    setDomainInput('');
  };

  const handleDomainKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (domainInput.trim()) {
        addDomain(domainInput);
      } else if (domains.length > 0) {
        // Enter with empty input and domains present → submit
        handleSubmit(e);
      }
    }
    if (e.key === ',') {
      e.preventDefault();
      addDomain(domainInput);
    }
    if (e.key === 'Backspace' && !domainInput && domains.length > 0) {
      setDomains((prev) => prev.slice(0, -1));
    }
  };

  const handleDomainBlur = () => {
    if (domainInput.trim()) addDomain(domainInput);
  };

  const removeDomain = (d) => setDomains((prev) => prev.filter((x) => x !== d));

  const handleSubmit = (e) => {
    e.preventDefault();
    const allDomains = domainInput.trim()
      ? [...domains, ...domainInput.split(',').map((d) => d.trim()).filter(Boolean)]
      : domains;
    if (allDomains.length === 0) return;
    setDomainInput('');
    setDomains(allDomains);

    const params = {
      company_domain: allDomains,
      fetch_count: fetchCount,
      enable_scoring: enableScoring,
    };

    if (vertical) {
      params.vertical = vertical;
    }

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
    <form onSubmit={handleSubmit}>
      {/* Company Domain(s) — tag input */}
      <div className="mb-8">
        <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
          Accounts <span className="normal-case tracking-normal text-[#A3A3A3] font-normal">(press Enter or comma to add each domain)</span>
        </label>
        <div className="flex flex-wrap gap-2 items-center py-2 border-b-2 border-[#075056] focus-within:border-b-[3px] transition-all duration-100 min-h-[3rem]">
          {domains.map((d) => (
            <span
              key={d}
              className="flex items-center gap-1 bg-[#075056] text-white text-xs px-2 py-1 font-[var(--font-fore-mono)] shrink-0"
            >
              {d}
              <button
                type="button"
                onClick={() => removeDomain(d)}
                className="ml-1 opacity-70 hover:opacity-100 leading-none cursor-pointer"
                aria-label={`Remove ${d}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyDown={handleDomainKeyDown}
            onBlur={handleDomainBlur}
            placeholder={domains.length === 0 ? 'e.g. airbus.com' : 'Add another…'}
            className="flex-1 min-w-[180px] px-0 py-1 bg-transparent border-0 text-base text-black placeholder:text-[#A3A3A3] placeholder:italic focus:outline-none"
          />
        </div>
      </div>

      {/* Vertical */}
      <div className="mb-8">
        <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
          Vertical <span className="normal-case tracking-normal text-[#A3A3A3] font-normal">(optional)</span>
        </label>
        <select
          value={vertical}
          onChange={(e) => setVertical(e.target.value)}
          className="w-full px-0 py-3 bg-transparent border-0 border-b-[1.5px] border-[#E5E7EB] text-base text-black focus:border-[#075056] focus:outline-none appearance-none transition-all duration-100 rounded-none cursor-pointer"
        >
          <option value="">-- No vertical --</option>
          <option value="banking">Banking</option>
          <option value="insurance">Insurance</option>
          <option value="media">Media</option>
          <option value="ecommerce">E-commerce</option>
          <option value="travel">Travel</option>
        </select>
      </div>

      {/* Persona Preset Selector */}
      <div className="mb-8">
        <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
          Persona Preset
        </label>
        <select
          value={selectedPersona}
          onChange={(e) => handlePersonaSelect(e.target.value)}
          className="w-full px-0 py-3 bg-transparent border-0 border-b-[1.5px] border-[#E5E7EB] text-base text-black focus:border-[#075056] focus:outline-none appearance-none transition-all duration-100 rounded-none cursor-pointer"
        >
          <option value="">-- Select a persona --</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {selectedPersona && (() => {
          const p = personas.find((p) => p.id === selectedPersona);
          if (!p) return null;
          return (
            <div className="text-xs text-[#A3A3A3] mt-2 font-[var(--font-fore-mono)] space-y-0.5">
              <p>Keywords: {p.job_titles.join(', ')}</p>
              {p.location && <p>Location: {p.location.join(', ')}</p>}
              {p.seniority_levels && <p>Seniority: {p.seniority_levels.join(', ')}</p>}
              {p.email_status && <p>Email: {p.email_status.join(', ')}</p>}
            </div>
          );
        })()}
      </div>

      {/* Advanced Filters Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-[#4e4f4d] hover:text-[#075056] mb-6 flex items-center gap-2 transition-colors duration-100 cursor-pointer uppercase tracking-[0.1em] font-[var(--font-fore-mono)] font-medium text-[11px]"
      >
        <span className={`transition-transform duration-100 text-xs ${showAdvanced ? 'rotate-90' : ''}`}>&#9654;</span>
        Advanced Filters
      </button>

      {showAdvanced && (
        <div className="space-y-6 mb-8 pl-6 border-l-2 border-[#075056]">
          {/* Title Keywords */}
          <div>
            <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
              Title Keywords <span className="normal-case tracking-normal text-[#A3A3A3] font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={titleKeywords}
              onChange={(e) => { setTitleKeywords(e.target.value); setSelectedPersona(''); }}
              placeholder="e.g. qa, devops, cto, engineering, test"
              className="w-full px-0 py-3 bg-transparent border-0 border-b-[1.5px] border-[#E5E7EB] text-base text-black placeholder:text-[#A3A3A3] placeholder:italic focus:border-[#075056] focus:outline-none transition-all duration-100 rounded-none"
            />
          </div>

          {/* Seniority Levels */}
          <div>
            <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
              Seniority Levels
            </label>
            <div className="flex flex-wrap gap-2">
              {SENIORITY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleSeniority(value)}
                  className={`px-4 py-2 text-[10px] border-2 transition-colors duration-100 cursor-pointer uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] rounded-none ${
                    seniorities.includes(value)
                      ? 'bg-[#075056] border-[#075056] text-white'
                      : 'bg-white border-[#E5E7EB] text-[#4e4f4d] hover:border-[#075056] hover:text-[#075056]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
              Location <span className="normal-case tracking-normal text-[#A3A3A3] font-normal">(region/country/state)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. france"
              className="w-full px-0 py-3 bg-transparent border-0 border-b-[1.5px] border-[#E5E7EB] text-base text-black placeholder:text-[#A3A3A3] placeholder:italic focus:border-[#075056] focus:outline-none transition-all duration-100 rounded-none"
            />
          </div>

          {/* Email Status */}
          <div>
            <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
              Email Status
            </label>
            <div className="flex flex-wrap gap-2">
              {EMAIL_STATUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleEmailStatus(value)}
                  className={`px-4 py-2 text-[10px] border-2 transition-colors duration-100 cursor-pointer uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] rounded-none ${
                    emailStatus.includes(value)
                      ? 'bg-[#075056] border-[#075056] text-white'
                      : 'bg-white border-[#E5E7EB] text-[#4e4f4d] hover:border-[#075056] hover:text-[#075056]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Max Leads */}
          <div>
            <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
              Max Leads: <span className="text-black font-bold">{fetchCount}</span>
            </label>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={fetchCount}
              onChange={(e) => setFetchCount(Number(e.target.value))}
              className="w-full accent-[#075056]"
            />
            <div className="flex justify-between text-[10px] text-[#A3A3A3] font-[var(--font-fore-mono)]">
              <span>10</span>
              <span>500</span>
            </div>
          </div>
        </div>
      )}

      {/* Scoring toggle */}
      <div className="mb-8">
        <Checkbox
          label={
            <span>
              Enable AI Scoring{' '}
              <span className="text-[#A3A3A3] text-xs font-[var(--font-fore-mono)]">(Gemini 2.5 Flash — ~$2.20/1k leads)</span>
            </span>
          }
          checked={enableScoring}
          onChange={(e) => setEnableScoring(e.target.checked)}
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={domains.length === 0 && !domainInput.trim()}
        variant="accent"
        size="lg"
        className="w-full"
      >
        {domains.length > 1
          ? `Run ${domains.length} Accounts →`
          : 'Run →'}
      </Button>
    </form>
  );
}
