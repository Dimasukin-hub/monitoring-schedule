'use client';

import React, { useState, useMemo } from 'react';
import { Clock, Search, Sprout, XCircle } from 'lucide-react';
import listLokasiProsesTanamDefault from '@/lib/listLokasiProsesTanam.json';

export interface ProsesTanamItem {
  wilayah: string;
  lokasi: string;
  jenisBibit?: string;
  kelasBibit?: string;
  bibit: string;
  progress: number;
  realTanam?: number;
  luasHa?: number;
  sisaHa?: number;
  estSelesai?: string;
  status?: string;
}

interface ListLokasiProsesTanamTableProps {
  data?: ProsesTanamItem[];
  onSelectLand?: (lokasi: string) => void;
}

export default function ListLokasiProsesTanamTable({
  data = listLokasiProsesTanamDefault as ProsesTanamItem[],
  onSelectLand,
}: ListLokasiProsesTanamTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter pencarian berdasarkan lokasi (atau wilayah/bibit)
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();
    return data.filter(
      (item) =>
        item.lokasi.toLowerCase().includes(q) ||
        item.wilayah.toLowerCase().includes(q) ||
        (item.bibit && item.bibit.toLowerCase().includes(q))
    );
  }, [data, searchQuery]);

  // Helper formatting angka
  const fmt = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '0,0';
    return val.toLocaleString('id-ID', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  };

  return (
    <div className="relative overflow-visible rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 glass-panel shadow-sm flex flex-col justify-start h-full space-y-4">
      {/* 1. Header Card (Judul Bersih, Badge Total, & Kotak Pencarian "Cari lokasi") */}
      <div className="space-y-3 pb-3 border-b border-slate-200/80 dark:border-slate-800 relative z-30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              List Lokasi Proses Tanam
            </h3>
          </div>

          {/* Badge Total Lokasi Proses */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs self-start sm:self-center">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Total: {filteredData.length} Lokasi</span>
          </div>
        </div>

        {/* Baris Kontrol: Search Box dengan Placeholder "Cari lokasi" & Icon Silang Lingkaran */}
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari lokasi"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                title="Hapus pencarian"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Tabel Data dengan Scroll Bar Vertikal & Sudut Kotak (Semua 10 Data Langsung dalam 1 Halaman) */}
      <div className="h-[340px] max-h-[340px] overflow-y-auto overflow-x-auto rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs custom-scrollbar relative z-10">
        <table className="w-full text-xs text-center border-separate border-spacing-0">
          <thead>
            <tr className="text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <th
                scope="col"
                className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-2.5 py-2.5 text-center w-12 border-b border-r border-t first:border-l border-slate-300 dark:border-slate-700 shadow-2xs"
              >
                No
              </th>
              <th
                scope="col"
                className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-center w-20 border-b border-r border-t first:border-l border-slate-300 dark:border-slate-700 shadow-2xs"
              >
                Wilayah
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
                className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-center border-b border-r border-t first:border-l border-slate-300 dark:border-slate-700 shadow-2xs min-w-[140px]"
              >
                % Progress
              </th>
            </tr>
          </thead>
          <tbody className="text-slate-700 dark:text-slate-200">
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-slate-400 border-b border-r first:border-l border-slate-300 dark:border-slate-700 italic bg-white dark:bg-slate-900"
                >
                  Tidak ada data lokasi proses tanam yang sesuai.
                </td>
              </tr>
            ) : (
              filteredData.map((row, idx) => {
                const isCrown = row.bibit?.toLowerCase().includes('crown');
                const prog = row.progress ?? 0;

                const progColor =
                  prog >= 80
                    ? 'bg-emerald-500'
                    : prog >= 40
                    ? 'bg-amber-500'
                    : 'bg-cyan-500';

                const badgeBg =
                  prog >= 80
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                    : prog >= 40
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                    : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20';

                return (
                  <tr
                    key={`${row.wilayah}-${row.lokasi}-${idx}`}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors bg-white dark:bg-slate-900"
                  >
                    {/* No */}
                    <td className="px-2.5 py-2 text-center font-medium text-slate-500 dark:text-slate-400 border-b border-r first:border-l border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                      {idx + 1}
                    </td>

                    {/* Wilayah */}
                    <td className="px-3 py-2 text-center border-b border-r first:border-l border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {row.wilayah}
                      </span>
                    </td>

                    {/* Lokasi (Teks Statis, Tanpa Klik Detail) */}
                    <td className="px-3 py-2 text-center border-b border-r first:border-l border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {row.lokasi}
                      </span>
                    </td>

                    {/* Bibit (Bentuk dan Ukuran Kotak Disamakan) */}
                    <td className="px-3 py-2 text-center border-b border-r first:border-l border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <span
                        className={`w-[125px] inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold border ${
                          isCrown
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        <Sprout className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{row.bibit || '-'}</span>
                      </span>
                    </td>

                    {/* % Progress (Bar & Angka) */}
                    <td className="px-3 py-2 text-center border-b border-r first:border-l border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <div className="flex items-center justify-center gap-2">
                        {/* Mini Progress Bar */}
                        <div className="w-16 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${progColor}`}
                            style={{ width: `${Math.min(100, Math.max(0, prog))}%` }}
                          />
                        </div>
                        {/* Badge Angka % */}
                        <span
                          className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border min-w-[48px] text-center ${badgeBg}`}
                        >
                          {fmt(prog)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
