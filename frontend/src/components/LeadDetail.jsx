export default function LeadDetail({ lead }) {
  return (
    <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Reasoning</h4>
          <p className="text-sm text-gray-700">{lead.reasoning || 'No reasoning available'}</p>
        </div>
        <div className="space-y-2">
          {lead.persona_label && (
            <div>
              <span className="text-xs font-medium text-gray-500">Persona: </span>
              <span className="text-sm text-gray-700">{lead.persona_label}</span>
            </div>
          )}
          {lead.outreach_angle && (
            <div>
              <span className="text-xs font-medium text-gray-500">Outreach Angle: </span>
              <span className="text-sm text-gray-700">{lead.outreach_angle}</span>
            </div>
          )}
          {lead.seniority_level && (
            <div>
              <span className="text-xs font-medium text-gray-500">Seniority: </span>
              <span className="text-sm text-gray-700">{lead.seniority_level}</span>
            </div>
          )}
          {lead.red_flags && (
            <div>
              <span className="text-xs font-medium text-gray-500">Red Flags: </span>
              <span className="text-sm text-red-600">{lead.red_flags}</span>
            </div>
          )}
          {lead.method && (
            <div>
              <span className="text-xs font-medium text-gray-500">Method: </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                lead.method === 'AI' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {lead.method}
              </span>
            </div>
          )}
          {lead.linkedin_url && (
            <div>
              <a
                href={lead.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View LinkedIn Profile &rarr;
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
