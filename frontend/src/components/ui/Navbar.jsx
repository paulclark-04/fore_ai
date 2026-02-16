export default function Navbar({ children, actions }) {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E5E7EB]">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Fore AI logo icon */}
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="6" width="18" height="3" rx="1.5" fill="#075056" />
            <rect x="4" y="14" width="24" height="3" rx="1.5" fill="#075056" />
            <rect x="4" y="22" width="14" height="3" rx="1.5" fill="#075056" />
          </svg>
          <span className="text-xl font-[var(--font-fore-heading)] text-[#075056] tracking-tight">
            fore
          </span>
          <span className="text-xs text-[#4e4f4d] ml-2 hidden sm:inline">
            Lead Scorer
          </span>
        </div>
        <div className="flex items-center gap-3">
          {actions}
        </div>
      </div>
    </header>
  );
}
