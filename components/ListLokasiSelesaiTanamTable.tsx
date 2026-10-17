'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sprout,
  XCircle,
} from 'lucide-react';
import MultiSelectDropdown from './MultiSelectDropdown';

export interface SelesaiTanamItem {
  wilayah: string;
  lokasi: string;
  jenisBibit?: string;
  kelasBibit?: string;
  bibit: string;
  tanggalSelesai: string;
  luasHa?: number;
  progress?: number;
}

interface ListLokasiSelesaiTanamTableProps {
  data?: SelesaiTanamItem[];
  onSelectLand?: (lokasi: string) => void;
}

const MONTH_NORM_MAP: Record<string, string> = {
  jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr',
  mei: 'Mei', may: 'Mei', jun: 'Jun', jul: 'Jul',
  agu: 'Agu', aug: 'Agu', agt: 'Agu', sep: 'Sep',
  okt: 'Okt', oct: 'Okt', nov: 'Nov', des: 'Des', dec: 'Des',
};

function extractMonthKey(dateStr: string | null | undefined): string | null {
  if (!dateStr || dateStr === '-') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const rawM = parts[1].toLowerCase().slice(0, 3);
    const m = MONTH_NORM_MAP[rawM] || parts[1];
    let y = parts[2];
    if (y.length === 4) y = y.slice(-2);
    return `${m}-${y}`;
  }
  return null;
}

export default function ListLokasiSelesaiTanamTable({
  data = [],
  onSelectLand,
}: ListLokasiSelesaiTanamTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWilayahs, setSelectedWilayahs] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Daftar wilayah unik untuk filter MultiSelectDropdown
  const availableWilayahs = useMemo(() => {
    const set = new Set<string>();
    data.forEach((item) => {
      if (item.wilayah) set.add(item.wilayah);
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [data]);

  // Daftar bulan selesai unik untuk filter MultiSelectDropdown
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    data.forEach((item) => {
      const mk = extractMonthKey(item.tanggalSelesai);
      if (mk) set.add(mk);
    });
    const MONTH_ORDER = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
    ];
    return Array.from(set).sort((a, b) => {
      const pA = a.split('-');
      const pB = b.split('-');
      const mA = MONTH_ORDER.indexOf(pA[0]);
      const mB = MONTH_ORDER.indexOf(pB[0]);
      return mA - mB;
    });
  }, [data]);

  // Filter pencarian, wilayah (multi), dan bulan selesai (multi)
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 1. Filter Wilayah (Multi-Select)
      if (selectedWilayahs.length > 0 && !selectedWilayahs.includes(item.wilayah)) {
        return false;
      }

      // 2. Filter Bulan Selesai (Multi-Select)
      if (selectedMonths.length > 0) {
        const itemMonthKey = extractMonthKey(item.tanggalSelesai);
        if (!itemMonthKey || !selectedMonths.includes(itemMonthKey)) {
          return false;
        }
      }

      // 3. Pencarian Berdasarkan Lokasi (atau wilayah/bibit)
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.lokasi.toLowerCase().includes(q) ||
        item.wilayah.toLowerCase().includes(q) ||
        (item.bibit && item.bibit.toLowerCase().includes(q))
      );
    });
  }, [data, searchQuery, selectedWilayahs, selectedMonths]);

  // Paginasi
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="relative overflow-visible rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 glass-panel shadow-sm flex flex-col justify-start h-full space-y-4">
      {/* 1. Header Card (Judul Bersih, Badge Total, Search "Cari lokasi" & Filter MultiSelect Wilayah & Bulan Selesai) */}
      <div className="space-y-3 pb-3 border-b border-slate-200/80 dark:border-slate-800 relative z-30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              List Lokasi Selesai Tanam
            </h3>
          </div>

          {/* Badge Total Lokasi */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs self-start sm:self-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Total: {filteredData.length} Lokasi</span>
          </div>
        </div>

        {/* Baris Kontrol: Search Box & MultiSelectDropdown Filters (Wilayah & Bulan Selesai) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
          {/* Kotak Pencarian "Cari lokasi" dengan Tombol Silang Lingkaran */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari lokasi"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                title="Hapus pencarian"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Wilayah (MultiSelectDropdown sama seperti tabel data lahan, align right agar tidak terpotong) */}
          <div className="shrink-0">
            <MultiSelectDropdown
              label="Wilayah"
              align="right"
              options={availableWilayahs}
              selected={selectedWilayahs}
              onChange={(val) => {
                setSelectedWilayahs(val);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Filter Bulan Selesai (MultiSelectDropdown sama seperti tabel data lahan) */}
          <div className="shrink-0">
            <MultiSelectDropdown
              label="Bulan Selesai"
              isMonthFilter
              align="right"
              options={availableMonths}
              selected={selectedMonths}
              onChange={(val) => {
                setSelectedMonths(val);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* 2. Tabel Data: Wilayah, Lokasi, Bibit, Tanggal Selesai dengan Sudut Kotak & Scroll Bar */}
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
                className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-center border-b border-r border-t first:border-l border-slate-300 dark:border-slate-700 shadow-2xs min-w-[170px]"
              >
                Bibit
              </th>
              <th
                scope="col"
                className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-center border-b border-r border-t first:border-l border-slate-300 dark:border-slate-700 shadow-2xs w-24"
              >
                Luas (Ha)
              </th>
              <th
                scope="col"
                className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-center border-b border-r border-t first:border-l border-slate-300 dark:border-slate-700 shadow-2xs"
              >
                Tanggal Selesai
              </th>
            </tr>
          </thead>
          <tbody className="text-slate-700 dark:text-slate-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-slate-400 border-b border-r first:border-l border-slate-300 dark:border-slate-700 italic bg-white dark:bg-slate-900"
                >
                  Tidak ada data lokasi selesai tanam yang sesuai.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const isCrown = row.bibit?.toLowerCase().includes('crown');
                const rowNumber = startIndex + idx + 1;

                return (
                  <tr
                    key={`${row.wilayah}-${row.lokasi}-${idx}`}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors bg-white dark:bg-slate-900"
                  >
                    {/* No */}
                    <td className="px-2.5 py-2 text-center font-medium text-slate-500 dark:text-slate-400 border-b border-r first:border-l border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                      {rowNumber}
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

                    {/* Bibit (Bentuk dan Ukuran Kotak Disamakan, Lebih Lebar agar Teks Tidak Terpotong) */}
                    <td className="px-3 py-2 text-center border-b border-r first:border-l border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <span
                        className={`w-[160px] inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border whitespace-nowrap shadow-2xs ${
                          isCrown
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        <Sprout className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap">{row.bibit || '-'}</span>
                      </span>
                    </td>

                    {/* Luas (Ha) - Dari Data Lahan yang lokasinya sudah selesai tanam */}
                    <td className="px-3 py-2 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 border-b border-r first:border-l border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                      {typeof row.luasHa === 'number'
                        ? row.luasHa.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : (row.luasHa || '-')}
                    </td>

                    {/* Tanggal Selesai (Bentuk dan Ukuran Kotak Disamakan) */}
                    <td className="px-3 py-2 text-center border-b border-r first:border-l border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <span className="w-[105px] inline-flex items-center justify-center gap-1.5 font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                        <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{row.tanggalSelesai || '-'}</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Footer Paginasi (Tanpa Teks "Menampilkan X dari Y Lokasi") */}
      {totalPages > 1 && (
        <div className="mt-auto flex items-center justify-end gap-1 pt-1 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handlePageChange(validPage - 1)}
            disabled={validPage <= 1}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2 font-mono text-xs text-slate-700 dark:text-slate-300">
            {validPage} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() => handlePageChange(validPage + 1)}
            disabled={validPage >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="Halaman Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
