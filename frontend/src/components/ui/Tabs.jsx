export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex border-b border-fore-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-medium transition-all duration-150 border-b-2 -mb-px cursor-pointer ${
            activeTab === tab.id
              ? 'text-fore-accent border-fore-accent'
              : 'text-fore-text-secondary border-transparent hover:text-fore-text hover:border-fore-border-hover'
          }`}
        >
          {tab.icon && <span className="mr-2">{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id
                ? 'bg-fore-accent/12 text-fore-accent'
                : 'bg-white/5 text-fore-text-secondary'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
