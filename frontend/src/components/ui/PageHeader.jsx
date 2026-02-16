export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-fore-text-heading font-[var(--font-fore-heading)] tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-fore-text-secondary mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
