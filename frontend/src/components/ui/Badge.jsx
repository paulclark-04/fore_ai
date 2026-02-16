const tierStyles = {
  A: 'bg-[rgba(7,80,86,0.08)] text-[#075056] border-[#075056]/20',
  B: 'bg-[rgba(90,207,93,0.08)] text-[#2d8a30] border-[#5acf5d]/20',
  C: 'bg-[rgba(245,158,11,0.08)] text-[#b45309] border-[#f59e0b]/20',
  D: 'bg-[rgba(239,68,68,0.08)] text-[#dc2626] border-[#ef4444]/20',
};

const statusStyles = {
  success: 'bg-[rgba(90,207,93,0.08)] text-[#2d8a30] border-[#5acf5d]/20',
  warning: 'bg-[rgba(245,158,11,0.08)] text-[#b45309] border-[#f59e0b]/20',
  error: 'bg-[rgba(239,68,68,0.08)] text-[#dc2626] border-[#ef4444]/20',
  info: 'bg-[rgba(7,80,86,0.08)] text-[#075056] border-[#075056]/20',
  neutral: 'bg-[#F6F8F9] text-[#4e4f4d] border-[#E5E7EB]',
};

export default function Badge({ children, tier, status, className = '' }) {
  const style = tier
    ? tierStyles[tier] || statusStyles.neutral
    : statusStyles[status] || statusStyles.neutral;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-none text-xs font-bold border ${style} ${className}`}
    >
      {children}
    </span>
  );
}
