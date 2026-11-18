'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Layers } from 'lucide-react';

export default function MasterListSulamView() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 max-w-xl mx-auto shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
        <Layers className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
        Tabel List Sulam Kini Berada di Menu Monitoring Sulam
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Sesuai konfigurasi terbaru, Tabel List Sulam (17 kolom) bekerja sebagai summary otomatis dari seluruh Master Data dan ditampilkan di menu utama Monitoring Sulam.
      </p>
      <div>
        <Link
          href="/sulam/monitor-sulam"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <span>Buka Monitoring Sulam</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
