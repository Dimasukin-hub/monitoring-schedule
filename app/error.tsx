'use client';

import React, { useEffect } from 'react';
import { RefreshCcw, AlertTriangle } from 'lucide-react';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for diagnostics
    console.error('Captured dashboard runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Terjadi Kendala Memuat Komponen
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sistem mendeteksi pembaruan data yang sangat cepat. Silakan klik tombol di bawah untuk memulihkan tampilan.
          </p>
        </div>
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Muat Ulang Komponen
        </button>
      </div>
    </div>
  );
}
