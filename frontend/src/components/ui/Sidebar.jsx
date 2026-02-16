export default function Sidebar({ items = [], activeItem, onItemClick }) {
  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r-2 border-[#075056] h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="6" width="18" height="3" rx="1.5" fill="#075056" />
            <rect x="4" y="14" width="24" height="3" rx="1.5" fill="#075056" />
            <rect x="4" y="22" width="14" height="3" rx="1.5" fill="#075056" />
          </svg>
          <span className="text-2xl font-[var(--font-fore-heading)] text-[#075056] tracking-tight">
            fore
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 space-y-0.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick?.(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-100 cursor-pointer rounded-none ${
              activeItem === item.id
                ? 'bg-[#075056] text-white font-medium'
                : 'text-[#4e4f4d] hover:text-[#075056] hover:bg-[#075056]/5'
            }`}
          >
            {item.icon && <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>}
            <span className="font-[var(--font-fore-mono)] text-[11px] uppercase tracking-[0.1em]">
              {item.label}
            </span>
            {item.badge && (
              <span className="ml-auto text-[10px] font-bold">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}
