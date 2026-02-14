const STEPS = [
  { key: 'search', label: 'Search', icon: '1' },
  { key: 'score', label: 'Score', icon: '2' },
  { key: 'done', label: 'Done', icon: '3' },
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        {STEPS.map((step, i) => {
          const status = getStepStatus(step.key, currentEvent);
          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    status === 'complete'
                      ? 'bg-green-500 text-white'
                      : status === 'running'
                      ? 'bg-blue-500 text-white animate-pulse'
                      : status === 'error'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {status === 'complete' ? '\u2713' : step.icon}
                </div>
                <span className={`text-xs mt-1 ${status === 'running' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-12px] ${
                    getStepStatus(STEPS[i + 1].key, currentEvent) !== 'pending'
                      ? 'bg-green-400'
                      : status === 'running' || status === 'complete'
                      ? 'bg-blue-300'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {currentEvent.step !== 'done' && currentEvent.step !== 'error' && (
        <div className="text-center">
          {currentEvent.current && (
            <p className="text-sm text-gray-600">{currentEvent.current}</p>
          )}
          {currentEvent.total > 0 && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${(currentEvent.progress / currentEvent.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {currentEvent.progress} / {currentEvent.total}
              </p>
            </div>
          )}
          {currentEvent.message && !currentEvent.current && (
            <p className="text-sm text-gray-500">{currentEvent.message}</p>
          )}
        </div>
      )}

      {currentEvent.step === 'error' && (
        <p className="text-center text-sm text-red-600">{currentEvent.message}</p>
      )}

      {currentEvent.step === 'done' && (
        <p className="text-center text-sm text-green-600 font-medium">{currentEvent.message}</p>
      )}
    </div>
  );
}
