'use client';

import React from 'react';
import { CalendarCheck, Sprout } from 'lucide-react';
import realTanamKemarinDefault from '@/lib/realTanamKemarin.json';

export interface RealTanamKemarinItem {
  no: number;
  lokasi: string;
  bibit: string;
  kelas?: string;
  luas: number;
  luasNetto?: number | null;
}

export interface RealTanamKemarinData {
  date: string;
  dateLabel: string;
  isoDate?: string;
  totalLuas: number;
  count: number;
  items: RealTanamKemarinItem[];
}

interface RealTanamKemarinTableProps {
  data?: RealTanamKemarinData;
}

export default function RealTanamKemarinTable({
  data = realTanamKemarinDefault as RealTanamKemarinData,
}: RealTanamKemarinTableProps) {
  const items = data?.items || [];
  const totalLuas = data?.totalLuas ?? items.reduce((acc, it) => acc + (it.luas || 0), 0);
  const displayDate = data?.dateLabel || data?.date || '13 Oktober 2026';

  const fmt = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '-';
    return val.toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 glass-panel shadow-sm flex flex-col justify-between h-full space-y-3">
      {/* 1. Header Card */}
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                Real Tanam Kemarin
              </h3>
            </div>
          </div>

          {/* Badge Tanggal H-1 */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{displayDate}</span>
          </div>
        </div>

        {/* 2. Tabel Real Tanam Kemarin (No, Lokasi, Bibit, Kelas, Luas) dengan Full Grid Border dan Sudut Kotak */}
        <div className="mt-3 flex-1 min-h-[280px] max-h-[360px] overflow-y-auto overflow-x-auto rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs custom-scrollbar">
          <table className="w-full text-xs text-center border-separate border-spacing-0">
            <thead>
              <tr className="text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <th
                  scope="col"
                  className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-center w-12 border-b border-r border-t first:border-l border-slate-300 dark:border-slate-700 shadow-2xs"
                >
                  No
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-center border-b border-r border-t first:border-l border-slate-300 dark:border-slate-700 shadow-2xs"
                >
                  Lokasi
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-center border-b border-r border-t first:border-l border-slate-300 dark:border-slate-700 shadow-2xs"
                >
                  Bibit
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-center border-b border-r border-t first:border-l border-slate-300 dark:border-slate-700 shadow-2xs"
                >
                  Kelas
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-center border-b border-r border-t first:border-l border-slate-300 dark:border-slate-700 shadow-2xs"
                >
                  Luas (Ha)
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-700 dark:text-slate-200">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-slate-400 border-b border-r first:border-l border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    Tidak ada data tanam pada tanggal ini.
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => {
                  const isCrown = row.bibit?.toLowerCase().includes('crown');
                  return (
                    <tr
                      key={`${row.lokasi}-${idx}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-3 py-2 text-center font-medium text-slate-500 dark:text-slate-400 border-b border-r first:border-l border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                        {row.no || idx + 1}
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-slate-900 dark:text-slate-100 border-b border-r first:border-l border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                        {row.lokasi}
                      </td>
                      <td className="px-3 py-2 text-center border-b border-r first:border-l border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                        <span
                          className={`w-[88px] inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border shadow-2xs ${
                            isCrown
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                              : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                          }`}
                        >
                          <Sprout className="w-3 h-3 shrink-0" />
                          <span>{row.bibit}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center border-b border-r first:border-l border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                        <span
                          className={`w-20 inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-semibold border shadow-2xs ${
                            row.kelas?.toLowerCase().includes('besar')
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
                              : row.kelas?.toLowerCase().includes('sedang')
                              ? 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30'
                              : row.kelas?.toLowerCase().includes('extra')
                              ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30'
                              : row.kelas?.toLowerCase().includes('kecil')
                              ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30'
                              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {row.kelas || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 border-b border-r first:border-l border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                        {fmt(row.luas)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Footer Total: Tulisan di Kiri, Angka di Tengah Sejajar dengan Kolom Luas */}
            {items.length > 0 && (
              <tfoot>
                <tr className="font-bold text-slate-800 dark:text-slate-100">
                  <td
                    colSpan={4}
                    className="sticky bottom-0 z-20 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-left uppercase text-[11px] tracking-wider border-b border-r border-t first:border-l border-slate-300 dark:border-slate-700 shadow-2xs"
                  >
                    Total Real Tanam
                  </td>
                  <td className="sticky bottom-0 z-20 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-center font-mono text-sm text-emerald-600 dark:text-emerald-400 font-extrabold border-b border-r border-t first:border-l border-slate-300 dark:border-slate-700 shadow-2xs">
                    {fmt(totalLuas)} Ha
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
