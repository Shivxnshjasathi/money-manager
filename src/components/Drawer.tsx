import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function Drawer({ open, onClose, title, children }: Props) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[100] fade-in overflow-hidden" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Drawer */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl slide-up max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle + Title */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border shrink-0">
          <div className="w-10 h-1 rounded-full bg-border absolute left-1/2 -translate-x-1/2 top-2" />
          <span className="text-base font-semibold mt-2">{title ?? ''}</span>
          <button onClick={onClose} className="p-1 mt-2">
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </div>
    </div>
  );
}
