import { useEffect, useRef } from 'react';

export default function Modal({ open, onClose, title, children, actions }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (open) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => { if (e.target === overlayRef.current) onClose?.(); }}
    >
      <div className="bg-white border-t-2 border-[#075056] w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-bold text-[#000000] font-[var(--font-fore-heading)] tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-[#4e4f4d] hover:text-[#101010] p-1 transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {actions && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#E5E7EB]">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
