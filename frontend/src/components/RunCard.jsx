import ExportButtons from './ExportButtons';

const STEPS = [
  { key: 'search', label: 'Search' },
  { key: 'filter', label: 'Filter' },
  { key: 'enrich', label: 'Enrich' },
  { key: 'score', label: 'Score' },
];

const STEP_ORDER = ['search', 'filter', 'enrich', 'score', 'done', 'error'];

function getStepStatus(stepKey, event) {
  if (!event) return 'pending';
  const currentIdx = STEP_ORDER.indexOf(event.step);
  const stepIdx = STEP_ORDER.indexOf(stepKey);
  if (event.step === 'error') return 'pending';
  if (stepIdx < currentIdx) return 'complete';
  if (stepIdx === currentIdx) return event.status === 'complete' ? 'complete' : 'running';
  return 'pending';
}

export default function RunCard({ runId, domain, event, isRunning, results, error }) {
  const isDone = event?.step === 'done';
  const isError = event?.step === 'error' || !!error;

  return (
    <div className="border border-[#E5E7EB] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-[var(--font-fore-mono)] text-sm font-medium text-black truncate">{domain}</span>
          {isRunning && (
            <span className="text-[10px] uppercase tracking-[0.1em] text-[#5acf5d] font-[var(--font-fore-mono)] font-medium shrink-0 animate-pulse">
              Running
            </span>
          )}
          {isDone && !isError && (
            <span className="text-[10px] uppercase tracking-[0.1em] text-[#075056] font-[var(--font-fore-mono)] font-medium shrink-0">
              {results.length} leads
            </span>
          )}
          {isError && (
            <span className="text-[10px] uppercase tracking-[0.1em] text-[#ce4100] font-[var(--font-fore-mono)] font-medium shrink-0">
              Error
            </span>
          )}
        </div>
        {isDone && results.length > 0 && (
          <div className="shrink-0 ml-3">
            <ExportButtons runId={runId} />
          </div>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex gap-1 mb-2">
        {STEPS.map((step) => {
          const status = getStepStatus(step.key, event);
          return (
            <div
              key={step.key}
              className={`flex-1 pt-1.5 border-t-2 ${
                status === 'complete'
                  ? 'border-[#075056]'
                  : status === 'running'
                  ? 'border-[#5acf5d]'
                  : 'border-[#E5E7EB]'
              }`}
            >
              <p
                className={`text-[10px] font-[var(--font-fore-mono)] uppercase tracking-[0.1em] ${
                  status === 'running'
                    ? 'text-[#5acf5d] font-bold'
                    : status === 'complete'
                    ? 'text-[#075056]'
                    : 'text-[#A3A3A3]'
                }`}
              >
                {step.label}
                {status === 'complete' && ' ✓'}
                {status === 'running' && ' …'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Status message */}
      {event && !isDone && !isError && event.message && (
        <p className="text-[11px] text-[#4e4f4d] font-[var(--font-fore-mono)] mt-1 truncate">{event.message}</p>
      )}
      {isDone && event?.message && (
        <p className="text-[11px] text-[#075056] font-[var(--font-fore-mono)] mt-1">{event.message}</p>
      )}
      {isError && (
        <p className="text-[11px] text-[#ce4100] mt-1">{error || event?.message}</p>
      )}

      {/* Cost */}
      {event?.cost && event.cost.total > 0 && (
        <p className="text-[10px] text-[#A3A3A3] font-[var(--font-fore-mono)] mt-1.5">
          Cost: ${event.cost.total.toFixed(3)}
        </p>
      )}
    </div>
  );
}
