export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto border-t-2 border-[#075056] ${className}`}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ children }) {
  return (
    <thead>
      <tr className="border-b border-[#E5E7EB]">{children}</tr>
    </thead>
  );
}

export function TableHeader({ children, className = '', ...props }) {
  return (
    <th
      className={`px-4 py-3 text-left text-[10px] font-semibold text-[#4e4f4d] uppercase tracking-[0.15em] font-[var(--font-fore-mono)] ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-[#E5E7EB]">{children}</tbody>;
}

export function TableRow({ children, className = '', onClick, ...props }) {
  return (
    <tr
      className={`bg-white hover:bg-[#F6F8F9] transition-colors duration-100 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = '', ...props }) {
  return (
    <td className={`px-4 py-3 text-[#101010] ${className}`} {...props}>
      {children}
    </td>
  );
}
