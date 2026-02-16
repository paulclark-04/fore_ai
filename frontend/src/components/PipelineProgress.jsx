const STEPS = [
  { key: 'search', label: 'Search', num: '01' },
  { key: 'enrich', label: 'Enrich', num: '02' },
  { key: 'score', label: 'Score', num: '03' },
  { key: 'done', label: 'Done', num: '04' },
];

const STEP_ORDER = STEPS.map((s) => s.key);

function getStepStatus(stepKey, currentEvent) {
  if (!currentEvent) return 'pending';
  const currentIdx = STEP_ORDER.indexOf(currentEvent.step);
  const stepIdx = STEP_ORDER.indexOf(stepKey);
  if (currentEvent.step === 'error') return stepIdx <= currentIdx ? 'error' : 'pending';
  if (stepIdx < currentIdx) return 'complete';
  if (stepIdx === currentIdx) return currentEvent.status === 'complete' ? 'complete' : 'running';
  return 'pending';
}

export default function PipelineProgress({ currentEvent }) {
  if (!currentEvent) return null;

  return (
    <div className="py-8">
      {/* Step indicators */}
      <div className="flex items-stretch mb-8">
        {STEPS.map((step) => {
          const status = getStepStatus(step.key, currentEvent);
          return (
            <div key={step.key} className="flex items-stretch flex-1">
              <div className={`flex-1 p-4 border-t-4 transition-colors duration-100 ${
                status === 'complete'
                  ? 'border-[#075056]'
                  : status === 'running'
                  ? 'border-[#5acf5d]'
                  : status === 'error'
                  ? 'border-[#ef4444]'
                  : 'border-[#E5E7EB]'
              }`}>
                <span className={`text-[10px] font-[var(--font-fore-mono)] tracking-[0.1em] ${
                  status === 'complete' || status === 'running' ? 'text-[#075056]' : 'text-[#A3A3A3]'
                }`}>
                  {step.num}
                </span>
                <p className={`text-[11px] font-medium mt-1 uppercase tracking-[0.1em] font-[var(--font-fore-mono)] ${
                  status === 'running' ? 'text-[#075056] font-bold' :
                  status === 'complete' ? 'text-[#075056]' :
                  'text-[#A3A3A3]'
                }`}>
                  {step.label}
                  {status === 'complete' && ' \u2713'}
                  {status === 'running' && ' ...'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress info */}
      {currentEvent.step !== 'done' && currentEvent.step !== 'error' && (
        <div>
          {currentEvent.current && (
            <p className="text-base text-black">{currentEvent.current}</p>
          )}
          {currentEvent.total > 0 && (
            <div className="mt-4">
              <div className="w-full bg-[#E5E7EB] h-1 overflow-hidden rounded-none">
                <div
                  className="bg-[#075056] h-1 transition-all duration-500 ease-out"
                  style={{ width: `${(currentEvent.progress / currentEvent.total) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-[#4e4f4d] mt-2 font-[var(--font-fore-mono)]">
                {currentEvent.progress} / {currentEvent.total}
              </p>
            </div>
          )}
          {currentEvent.message && !currentEvent.current && (
            <p className="text-sm text-[#4e4f4d]">{currentEvent.message}</p>
          )}
        </div>
      )}

      {currentEvent.step === 'error' && (
        <p className="text-base text-[#ce4100] font-medium border-l-4 border-[#ce4100] pl-4">
          {currentEvent.message}
        </p>
      )}

      {currentEvent.step === 'done' && (
        <p className="text-base text-[#075056] font-medium border-l-4 border-[#075056] pl-4">
          {currentEvent.message}
        </p>
      )}

      {/* Cost breakdown */}
      {currentEvent.cost && currentEvent.cost.total > 0 && (
        <div className="mt-6 border-t border-[#E5E7EB] pt-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)] mb-3">
            Run Cost
          </p>
          <div className="flex gap-6 text-xs font-[var(--font-fore-mono)]">
            {currentEvent.cost.leads_finder > 0 && (
              <span className="text-[#4e4f4d]">
                Leads Finder: <span className="text-black font-medium">${currentEvent.cost.leads_finder.toFixed(3)}</span>
              </span>
            )}
            {currentEvent.cost.linkedin_enrichment > 0 && (
              <span className="text-[#4e4f4d]">
                Enrichment: <span className="text-black font-medium">${currentEvent.cost.linkedin_enrichment.toFixed(3)}</span>
              </span>
            )}
            <span className="text-[#075056] font-bold">
              Total: ${currentEvent.cost.total.toFixed(3)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
