const variants = {
  primary:
    'bg-[#075056] text-white font-medium hover:bg-[#064045] active:bg-[#053538]',
  secondary:
    'bg-transparent text-[#075056] font-medium border-2 border-[#075056] hover:bg-[#075056]/5',
  ghost:
    'bg-transparent text-[#075056] font-medium hover:bg-[#075056]/5',
  danger:
    'bg-transparent text-[#ce4100] font-medium border-2 border-[#ce4100] hover:bg-[#ce4100]/5',
  accent:
    'bg-[#5acf5d] text-[#000000] font-semibold hover:brightness-110',
};

const sizes = {
  sm: 'px-4 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-none transition-colors duration-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
