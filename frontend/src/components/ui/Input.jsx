export function Input({ label, className = '', ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-[10px] font-medium text-[#4e4f4d] uppercase tracking-[0.15em] mb-2 font-[var(--font-fore-mono)]">
          {label}
        </label>
      )}
      <input
        className={`w-full px-0 py-3 bg-transparent border-0 border-b-[1.5px] border-[#E5E7EB] rounded-none text-sm text-[#101010] placeholder:text-[#A3A3A3] placeholder:italic focus:border-[#075056] outline-none transition-all duration-100 ${className}`}
        {...props}
      />
    </div>
  );
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-[10px] font-medium text-[#4e4f4d] uppercase tracking-[0.15em] mb-2 font-[var(--font-fore-mono)]">
          {label}
        </label>
      )}
      <select
        className={`w-full px-0 py-3 bg-transparent border-0 border-b-[1.5px] border-[#E5E7EB] rounded-none text-sm text-[#101010] focus:border-[#075056] outline-none appearance-none transition-all duration-100 cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function Textarea({ label, className = '', ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-[10px] font-medium text-[#4e4f4d] uppercase tracking-[0.15em] mb-2 font-[var(--font-fore-mono)]">
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-0 py-3 bg-transparent border-0 border-b-[1.5px] border-[#E5E7EB] rounded-none text-sm text-[#101010] placeholder:text-[#A3A3A3] placeholder:italic focus:border-[#075056] outline-none transition-all duration-100 resize-y min-h-[80px] ${className}`}
        {...props}
      />
    </div>
  );
}

export function Checkbox({ label, className = '', ...props }) {
  return (
    <label className={`flex items-center gap-2.5 cursor-pointer select-none ${className}`}>
      <input
        type="checkbox"
        className="w-4 h-4 rounded-none border-[#E5E7EB] text-[#075056] accent-[#075056] focus:ring-0"
        {...props}
      />
      <span className="text-sm text-[#101010]">{label}</span>
    </label>
  );
}
