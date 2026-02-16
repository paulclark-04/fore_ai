export default function StatCard({ label, value, subtext, className = '' }) {
  return (
    <div className={`border-t-2 border-[#075056] pt-4 ${className}`}>
      <p className="text-[10px] font-medium text-[#4e4f4d] uppercase tracking-[0.15em] font-[var(--font-fore-mono)]">
        {label}
      </p>
      <p className="text-4xl font-bold text-[#000000] font-[var(--font-fore-heading)] tracking-tighter mt-1">
        {value}
      </p>
      {subtext && (
        <p className="text-xs text-[#4e4f4d] mt-1">{subtext}</p>
      )}
    </div>
  );
}
