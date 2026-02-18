import { useState } from 'react';
import Badge from './ui/Badge';

export default function LeadDetail({ lead }) {
  const [showAiDebug, setShowAiDebug] = useState(false);

  return (
    <div className="bg-[#F6F8F9] border-t border-[#E5E7EB] px-6 py-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] mb-2 font-[var(--font-fore-mono)]">
            Reasoning
          </h4>
          <p className="text-base text-black leading-relaxed">
            {lead.reasoning || 'No reasoning available'}
          </p>
        </div>
        <div className="space-y-3">
          {lead.persona_label && (
            <div>
              <span className="text-[10px] font-medium text-[#4e4f4d] font-[var(--font-fore-mono)] uppercase tracking-[0.1em]">Persona: </span>
              <span className="text-sm text-black">{lead.persona_label}</span>
            </div>
          )}
          {lead.seniority_level && (
            <div>
              <span className="text-[10px] font-medium text-[#4e4f4d] font-[var(--font-fore-mono)] uppercase tracking-[0.1em]">Seniority: </span>
              <span className="text-sm text-black">{lead.seniority_level}</span>
            </div>
          )}
          {lead.red_flags && (
            <div>
              <span className="text-[10px] font-medium text-[#4e4f4d] font-[var(--font-fore-mono)] uppercase tracking-[0.1em]">Red Flags: </span>
              <span className="text-sm text-black font-medium">{lead.red_flags}</span>
            </div>
          )}
          {lead.method && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-[#4e4f4d] font-[var(--font-fore-mono)] uppercase tracking-[0.1em]">Method:</span>
              <Badge status={lead.method === 'AI' ? 'info' : 'neutral'}>
                {lead.method}
              </Badge>
            </div>
          )}
          {lead.linkedin_url && (
            <div>
              <a
                href={lead.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#075056] underline underline-offset-4 hover:no-underline transition-all duration-100"
              >
                View LinkedIn Profile
                <span>&rarr;</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* AI Debug Section */}
      {(lead.ai_input || lead.ai_output) && (
        <div className="border-t border-[#E5E7EB] pt-4">
          <button
            type="button"
            onClick={() => setShowAiDebug(!showAiDebug)}
            className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] font-[var(--font-fore-mono)] flex items-center gap-2 cursor-pointer hover:text-[#075056] transition-colors duration-100"
          >
            <span className={`transition-transform duration-100 text-xs ${showAiDebug ? 'rotate-90' : ''}`}>&#9654;</span>
            AI Debug
          </button>

          {showAiDebug && (
            <div className="mt-4 space-y-4">
              {lead.ai_input && (
                <div>
                  <h5 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] mb-2 font-[var(--font-fore-mono)]">
                    Input (Profile Text)
                  </h5>
                  <pre className="text-xs text-black bg-white border border-[#E5E7EB] p-4 overflow-x-auto whitespace-pre-wrap max-h-80 overflow-y-auto font-[var(--font-fore-mono)]">
                    {lead.ai_input}
                  </pre>
                </div>
              )}
              {lead.ai_output && (
                <div>
                  <h5 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4e4f4d] mb-2 font-[var(--font-fore-mono)]">
                    Output (Raw Response)
                  </h5>
                  <pre className="text-xs text-black bg-white border border-[#E5E7EB] p-4 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto font-[var(--font-fore-mono)]">
                    {lead.ai_output}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
