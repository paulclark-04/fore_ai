import { useState, useEffect } from 'react';

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

export default function PersonasPage() {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newTitles, setNewTitles] = useState('');
  const [newLocation, setNewLocation] = useState('france');
  const [newSeniorities, setNewSeniorities] = useState(['c_suite', 'vp', 'director']);
  const [newEmailStatus, setNewEmailStatus] = useState(['validated']);
  const [saving, setSaving] = useState(false);

  const fetchPersonas = () => {
    fetch('/api/personas')
      .then((r) => r.json())
      .then(setPersonas)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newTitles.trim()) return;

    setSaving(true);
    try {
      const resp = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          job_titles: newTitles.split(',').map((t) => t.trim()).filter(Boolean),
          seniority_levels: newSeniorities.length > 0 ? newSeniorities : null,
          location: newLocation.trim() ? newLocation.split(',').map((l) => l.trim()).filter(Boolean) : null,
          email_status: newEmailStatus.length > 0 ? newEmailStatus : null,
        }),
      });
      if (resp.ok) {
        setNewName('');
        setNewTitles('');
        setNewLocation('france');
        setNewSeniorities(['c_suite', 'vp', 'director']);
        setNewEmailStatus(['validated']);
        fetchPersonas();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/personas/${id}`, { method: 'DELETE' });
      fetchPersonas();
    } catch {}
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-5xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter leading-none mb-10">
          Personas
        </h1>
        <p className="text-sm text-[#4e4f4d]">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-5xl font-bold text-black font-[var(--font-fore-heading)] tracking-tighter leading-none mb-2">
        Personas
      </h1>
      <p className="text-sm text-[#4e4f4d] mb-10">
        Manage persona presets for lead search filters
      </p>

      {/* Create form */}
      <form onSubmit={handleCreate} className="mb-10">
        <div className="border-t-2 border-[#075056] pt-6">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)] mb-6">
            New Persona
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
                Persona Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. QA Leadership"
                className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-[#075056] text-base text-black placeholder:text-[#A3A3A3] placeholder:italic focus:border-b-[3px] focus:outline-none transition-all duration-100 rounded-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
                Job Title Keywords <span className="normal-case tracking-normal text-[#A3A3A3] font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={newTitles}
                onChange={(e) => setNewTitles(e.target.value)}
                placeholder="e.g. qa, test, release, recette"
                className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-[#075056] text-base text-black placeholder:text-[#A3A3A3] placeholder:italic focus:border-b-[3px] focus:outline-none transition-all duration-100 rounded-none"
                required
              />
            </div>
          </div>

          {/* Location */}
          <div className="mb-6">
            <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
              Location <span className="normal-case tracking-normal text-[#A3A3A3] font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="e.g. france"
              className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-[#075056] text-base text-black placeholder:text-[#A3A3A3] placeholder:italic focus:border-b-[3px] focus:outline-none transition-all duration-100 rounded-none"
            />
          </div>

          {/* Seniority Levels */}
          <div className="mb-6">
            <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
              Seniority Levels
            </label>
            <div className="flex flex-wrap gap-2">
              {SENIORITY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setNewSeniorities((prev) =>
                    prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
                  )}
                  className={`px-4 py-2 text-[10px] border-2 transition-colors duration-100 cursor-pointer uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] rounded-none ${
                    newSeniorities.includes(value)
                      ? 'bg-[#075056] border-[#075056] text-white'
                      : 'bg-white border-[#E5E7EB] text-[#4e4f4d] hover:border-[#075056] hover:text-[#075056]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Email Status */}
          <div className="mb-6">
            <label className="block text-[10px] font-medium tracking-[0.15em] uppercase text-[#4e4f4d] mb-3 font-[var(--font-fore-mono)]">
              Email Status
            </label>
            <div className="flex flex-wrap gap-2">
              {EMAIL_STATUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setNewEmailStatus((prev) =>
                    prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
                  )}
                  className={`px-4 py-2 text-[10px] border-2 transition-colors duration-100 cursor-pointer uppercase tracking-[0.1em] font-medium font-[var(--font-fore-mono)] rounded-none ${
                    newEmailStatus.includes(value)
                      ? 'bg-[#075056] border-[#075056] text-white'
                      : 'bg-white border-[#E5E7EB] text-[#4e4f4d] hover:border-[#075056] hover:text-[#075056]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !newName.trim() || !newTitles.trim()}
            className="px-6 py-3 bg-[#5acf5d] text-black text-sm font-bold uppercase tracking-[0.1em] font-[var(--font-fore-mono)] rounded-none hover:bg-[#4db850] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-100 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Create Persona'}
          </button>
        </div>
      </form>

      {/* Personas list */}
      <div>
        <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)] mb-4">
          Saved Personas ({personas.length})
        </h2>

        {personas.length === 0 ? (
          <div className="border-t-2 border-[#075056] pt-8 pb-12 text-center">
            <p className="text-lg text-[#4e4f4d] mb-2">No personas yet</p>
            <p className="text-sm text-[#A3A3A3]">
              Create your first persona preset above
            </p>
          </div>
        ) : (
          <div className="border-t-2 border-[#075056]">
            {personas.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-4 border-b border-[#E5E7EB] bg-white hover:bg-[#F6F8F9] transition-colors duration-100"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-black">{p.name}</p>
                  <p className="text-xs text-[#A3A3A3] mt-1 font-[var(--font-fore-mono)] truncate">
                    {p.job_titles.join(', ')}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    {p.location && (
                      <span className="text-[10px] text-[#4e4f4d] font-[var(--font-fore-mono)]">
                        Location: {p.location.join(', ')}
                      </span>
                    )}
                    {p.seniority_levels && (
                      <span className="text-[10px] text-[#4e4f4d] font-[var(--font-fore-mono)]">
                        Seniority: {p.seniority_levels.join(', ')}
                      </span>
                    )}
                    {p.email_status && (
                      <span className="text-[10px] text-[#4e4f4d] font-[var(--font-fore-mono)]">
                        Email: {p.email_status.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-[10px] font-medium text-[#A3A3A3] hover:text-[#ce4100] uppercase tracking-[0.1em] font-[var(--font-fore-mono)] transition-colors duration-100 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
