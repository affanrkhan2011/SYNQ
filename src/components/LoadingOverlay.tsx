import React from 'react';

export default function LoadingOverlay({ show, label }: { show: boolean; label?: string }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="flex flex-col items-center gap-3 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        <div className="text-sm opacity-90">{label ?? 'Connecting…'}</div>
      </div>
    </div>
  );
}

