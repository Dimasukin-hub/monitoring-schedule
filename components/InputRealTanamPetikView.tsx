'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  XCircle,
  Check,
  Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import TableDatePicker from '@/components/TableDatePicker';

interface TransactionItem {
  id: number;
  tanggal: string | null;
  lokasi: string;
  luasNetto: number | null;
  aktivitas: string | null;
  standar: number | null;
  besar: number | null;
  sedang: number | null;
  kecil: number | null;
  extraKecil: number | null;
  total: number;
  jenisBibit: string | null;
  wilayah: string | null;
  awalTanam: string | null;
  selesaiTanam: string | null;
  akumTanam: number | null;
  persenTanam: number | null;
  petikKe: string | null;
  sourceFile: string | null;
  sourceSheet: string | null;
}

const MONTH_LIST = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
];

const WILAYAH_LIST = [
  'Barat',
  'Timur',
  'W01',
  'W02',
  'W03',
  'W04',
  'W05',
  'W06',
  'W07',
];

const AKTIVITAS_LIST = ['Tanam Bibit', 'Petik Bibit'];
const JENIS_BIBIT_LIST = ['Crown', 'Sucker'];

export default function InputRealTanamPetikView() {
  const [data, setData] = useState<TransactionItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Multi-Dropdown Filter States
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedWilayahs, setSelectedWilayahs] = useState<string[]>([]);
  const [selectedAktivitas, setSelectedAktivitas] = useState<string[]>([]);
  const [selectedJenisBibit, setSelectedJenisBibit] = useState<string[]>([]);

  // Open Popover state
  const [openDropdown, setOpenDropdown] = useState<'bulan' | 'wilayah' | 'aktivitas' | 'jenis' | null>(null);
  const bulanRef = useRef<HTMLDivElement>(null);
  const wilayahRef = useRef<HTMLDivElement>(null);
  const aktivitasRef = useRef<HTMLDivElement>(null);
  const jenisRef = useRef<HTMLDivElement>(null);

  // Sorting & Pagination States
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);
  const [sortField, setSortField] = useState<string>('tanggalDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Inline Editing States
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [savingCell, setSavingCell] = useState<{ id: number; field: string } | null>(null);
  const [savedSuccessCell, setSavedSuccessCell] = useState<{ id: number; field: string } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus input when cell editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Close dropdown on click outside anywhere
  useEffect(() => {
    if (!openDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        (openDropdown === 'bulan' && bulanRef.current && !bulanRef.current.contains(target)) ||
        (openDropdown === 'wilayah' && wilayahRef.current && !wilayahRef.current.contains(target)) ||
        (openDropdown === 'aktivitas' && aktivitasRef.current && !aktivitasRef.current.contains(target)) ||
        (openDropdown === 'jenis' && jenisRef.current && !jenisRef.current.contains(target))
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch transactions from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortField,
        sortOrder,
      });

      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedMonths.length > 0) params.set('month', selectedMonths.join(','));
      if (selectedWilayahs.length > 0) params.set('wilayah', selectedWilayahs.join(','));
      if (selectedAktivitas.length > 0) params.set('aktivitas', selectedAktivitas.join(','));
      if (selectedJenisBibit.length > 0) params.set('jenisBibit', selectedJenisBibit.join(','));

      const res = await fetch(`/api/planting/transactions?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setData(json.data || []);
        setTotal(json.total || 0);
        setTotalPages(json.totalPages || 1);
      } else {
        setError(json.error || 'Gagal memuat data transaksi');
      }
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      setError('Terjadi kesalahan saat memuat data transaksi.');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    debouncedSearch,
    selectedMonths,
    selectedWilayahs,
    selectedAktivitas,
    selectedJenisBibit,
    sortField,
    sortOrder,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Start cell editing
  const startEdit = (item: TransactionItem, field: string) => {
    if (field === 'lokasi') return; // Lokasi is read-only
    setEditingCell({ id: item.id, field });
    const rawVal = item[field as keyof TransactionItem];
    setEditValue(rawVal ?? '');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Save cell edit to database
  const handleSaveEdit = async (item: TransactionItem, field: string, val: any) => {
    setEditingCell(null);
    const existingVal = item[field as keyof TransactionItem];
    if (existingVal == val) return;

    setSavingCell({ id: item.id, field });
    try {
      const payload: any = { transactionId: item.id };
      if (
        ['total', 'luasNetto', 'standar', 'besar', 'sedang', 'kecil', 'extraKecil', 'akumTanam', 'persenTanam'].includes(
          field
        )
      ) {
        payload[field] = val === '' || val === null || isNaN(Number(val)) ? 0 : Number(val);
      } else {
        payload[field] = val ? String(val).trim() : null;
      }

      const res = await fetch('/api/planting/detail', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        setSavedSuccessCell({ id: item.id, field });
        setTimeout(() => setSavedSuccessCell(null), 1500);

        // Optimistically update local state
        setData((prev) =>
          prev.map((row) => (row.id === item.id ? { ...row, [field]: payload[field] } : row))
        );
      } else {
        alert(json.error || 'Gagal menyimpan perubahan.');
      }
    } catch (err) {
      console.error('Error saving inline edit:', err);
      alert('Terjadi kesalahan saat menyimpan perubahan.');
    } finally {
      setSavingCell(null);
    }
  };

  // Render stacked ChevronUp and ChevronDown sort arrows (persis tabel Real Tanam Nanas)
  const renderSortArrows = (field: string) => {
    const isFieldActive = sortField === field;
    return (
      <span className="inline-flex flex-col ml-1 shrink-0 select-none">
        <span
          role="button"
          tabIndex={0}
          title="Urutkan Naik"
          onClick={(e) => {
            e.stopPropagation();
            setSortField(field);
            setSortOrder('asc');
            setPage(1);
          }}
          className="p-0 cursor-pointer"
        >
          <ChevronUp
            className={`w-3 h-3 -mb-1 transition-colors ${
              isFieldActive && sortOrder === 'asc'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold stroke-[3]'
                : 'text-slate-300 dark:text-slate-600 hover:text-emerald-500'
            }`}
          />
        </span>
        <span
          role="button"
          tabIndex={0}
          title="Urutkan Turun"
          onClick={(e) => {
            e.stopPropagation();
            setSortField(field);
            setSortOrder('desc');
            setPage(1);
          }}
          className="p-0 cursor-pointer"
        >
          <ChevronDown
            className={`w-3 h-3 transition-colors ${
              isFieldActive && sortOrder === 'desc'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold stroke-[3]'
                : 'text-slate-300 dark:text-slate-600 hover:text-emerald-500'
            }`}
          />
        </span>
      </span>
    );
  };

  // Export to Excel function (matching updated column order)
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams({
        all: 'true',
        sortField,
        sortOrder,
      });

      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedMonths.length > 0) params.set('month', selectedMonths.join(','));
      if (selectedWilayahs.length > 0) params.set('wilayah', selectedWilayahs.join(','));
      if (selectedAktivitas.length > 0) params.set('aktivitas', selectedAktivitas.join(','));
      if (selectedJenisBibit.length > 0) params.set('jenisBibit', selectedJenisBibit.join(','));

      const res = await fetch(`/api/planting/transactions?${params.toString()}`);
      const json = await res.json();

      if (!json.success || !json.data) {
        alert('Gagal mengambil data untuk export Excel.');
        return;
      }

      // Order matching Excel Monitor Siap Nanas Update
      const rows = json.data.map((item: TransactionItem, idx: number) => ({
        No: idx + 1,
        Tanggal: item.tanggal || '',
        Lokasi: item.lokasi || '',
        'Luas Netto (Ha)': item.luasNetto !== null ? Number(item.luasNetto.toFixed(2)) : '',
        Aktivitas: item.aktivitas || '',
        'Standar (Ha)': item.standar !== null ? Number(item.standar.toFixed(2)) : 0,
        'Besar (Ha)': item.besar !== null ? Number(item.besar.toFixed(2)) : 0,
        'Sedang (Ha)': item.sedang !== null ? Number(item.sedang.toFixed(2)) : 0,
        'Kecil (Ha)': item.kecil !== null ? Number(item.kecil.toFixed(2)) : 0,
        'Extra Kecil (Ha)': item.extraKecil !== null ? Number(item.extraKecil.toFixed(2)) : 0,
        'Total (Ha)': Number(item.total.toFixed(2)),
        'Jenis Bibit': item.jenisBibit || '',
        Wilayah: item.wilayah || '',
        'Awal Tanam': item.awalTanam || '',
        'Selesai Tanam': item.selesaiTanam || '',
        'Akum Tanam (Ha)': item.akumTanam !== null ? Number(item.akumTanam.toFixed(2)) : '',
        '% Tanam': item.persenTanam !== null ? `${(item.persenTanam * 100).toFixed(1)}%` : '',
        'Petik Ke': item.petikKe || '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 14 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 10 },
        { wch: 10 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Input Real Tanam & Petik');

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Input_Real_Tanam_Petik_Nanas_${dateStr}.xlsx`);
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Terjadi kesalahan saat export data ke Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Toolbar Card (relative z-40 ensures popover stays above table) */}
      <div className="relative z-40 bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Sisi Kiri: Judul Sub Menu */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Tabel Input Real Tanam & Petik Nanas
            </h2>
          </div>

          {/* Sisi Kanan: Action Button (Export Excel saja) */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              disabled={isExporting || total === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
              title="Unduh seluruh data sesuai filter saat ini ke file Excel"
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Mengekspor...' : 'Export Excel'}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* 1. Search Bar (Placeholder 'Cari Lokasi' tanpa titik, muncul XCircle silang lingkaran saat ada teks) */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Lokasi"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5 rounded-full transition-colors"
                title="Hapus pencarian"
              >
                <XCircle className="w-4 h-4 fill-slate-300 dark:fill-slate-600 text-white dark:text-slate-900 hover:opacity-80 transition-opacity" />
              </button>
            )}
          </div>

          {/* Filter Multi-Dropdowns Menyamping Rapi */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 2. Filter Multi-Dropdown: Bulan */}
            <div ref={bulanRef} className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'bulan' ? null : 'bulan')}
                className={`h-9 px-3.5 inline-flex items-center justify-between gap-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer min-w-[100px] ${
                  selectedMonths.length > 0
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                <span>Bulan</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedMonths.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${
                      openDropdown === 'bulan' ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {openDropdown === 'bulan' && (
                <div className="absolute left-0 mt-2 z-50 w-[300px] sm:w-[360px] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMonths(MONTH_LIST.map((m) => m.value));
                        setPage(1);
                      }}
                      className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    {selectedMonths.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMonths([]);
                          setPage(1);
                        }}
                        className="font-semibold text-rose-500 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  {/* Pilihan Menyamping Grid 3 Kolom */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {MONTH_LIST.map((m) => {
                      const isChecked = selectedMonths.includes(m.value);
                      return (
                        <label
                          key={m.value}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300 font-semibold shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMonths([...selectedMonths, m.value]);
                              } else {
                                setSelectedMonths(selectedMonths.filter((v) => v !== m.value));
                              }
                              setPage(1);
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 shrink-0"
                          />
                          <span className="truncate">{m.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Filter Multi-Dropdown: Wilayah */}
            <div ref={wilayahRef} className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'wilayah' ? null : 'wilayah')}
                className={`h-9 px-3.5 inline-flex items-center justify-between gap-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer min-w-[105px] ${
                  selectedWilayahs.length > 0
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                <span>Wilayah</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedWilayahs.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${
                      openDropdown === 'wilayah' ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {openDropdown === 'wilayah' && (
                <div className="absolute left-0 sm:left-0 mt-2 z-50 w-[280px] sm:w-[310px] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWilayahs([...WILAYAH_LIST]);
                        setPage(1);
                      }}
                      className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    {selectedWilayahs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedWilayahs([]);
                          setPage(1);
                        }}
                        className="font-semibold text-rose-500 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  {/* Pilihan Menyamping Grid 3 Kolom */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {WILAYAH_LIST.map((w) => {
                      const isChecked = selectedWilayahs.includes(w);
                      return (
                        <label
                          key={w}
                          className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300 font-semibold shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedWilayahs([...selectedWilayahs, w]);
                              } else {
                                setSelectedWilayahs(selectedWilayahs.filter((v) => v !== w));
                              }
                              setPage(1);
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 shrink-0"
                          />
                          <span className="truncate">{w}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Filter Multi-Dropdown: Aktivitas */}
            <div ref={aktivitasRef} className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'aktivitas' ? null : 'aktivitas')}
                className={`h-9 px-3.5 inline-flex items-center justify-between gap-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer min-w-[110px] ${
                  selectedAktivitas.length > 0
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                <span>Aktivitas</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedAktivitas.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${
                      openDropdown === 'aktivitas' ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {openDropdown === 'aktivitas' && (
                <div className="absolute right-0 sm:right-0 mt-2 z-50 w-[270px] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAktivitas([...AKTIVITAS_LIST]);
                        setPage(1);
                      }}
                      className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    {selectedAktivitas.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAktivitas([]);
                          setPage(1);
                        }}
                        className="font-semibold text-rose-500 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  {/* Pilihan Menyamping Grid 2 Kolom */}
                  <div className="grid grid-cols-2 gap-2 whitespace-nowrap">
                    {AKTIVITAS_LIST.map((akt) => {
                      const isChecked = selectedAktivitas.includes(akt);
                      return (
                        <label
                          key={akt}
                          className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300 font-semibold shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAktivitas([...selectedAktivitas, akt]);
                              } else {
                                setSelectedAktivitas(selectedAktivitas.filter((v) => v !== akt));
                              }
                              setPage(1);
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 shrink-0"
                          />
                          <span>{akt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 5. Filter Multi-Dropdown: Jenis Bibit */}
            <div ref={jenisRef} className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'jenis' ? null : 'jenis')}
                className={`h-9 px-3.5 inline-flex items-center justify-between gap-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer min-w-[115px] ${
                  selectedJenisBibit.length > 0
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                <span>Jenis Bibit</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedJenisBibit.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${
                      openDropdown === 'jenis' ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {openDropdown === 'jenis' && (
                <div className="absolute right-0 mt-2 z-50 w-[240px] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedJenisBibit([...JENIS_BIBIT_LIST]);
                        setPage(1);
                      }}
                      className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    {selectedJenisBibit.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedJenisBibit([]);
                          setPage(1);
                        }}
                        className="font-semibold text-rose-500 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  {/* Pilihan Menyamping Grid 2 Kolom */}
                  <div className="grid grid-cols-2 gap-2 whitespace-nowrap">
                    {JENIS_BIBIT_LIST.map((jb) => {
                      const isChecked = selectedJenisBibit.includes(jb);
                      return (
                        <label
                          key={jb}
                          className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300 font-semibold shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedJenisBibit([...selectedJenisBibit, jb]);
                              } else {
                                setSelectedJenisBibit(selectedJenisBibit.filter((v) => v !== jb));
                              }
                              setPage(1);
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 shrink-0"
                          />
                          <span>{jb}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Container (Freeze Panes Vertikal & Horizontal Dari NO sampai AKTIVITAS) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300">
        <div className="overflow-x-auto max-h-[68vh] overflow-y-auto">
          <table className="w-full text-center border-collapse text-xs border border-slate-200 dark:border-slate-800">
            {/* Header Sticky Top-0 z-30 (Solid Opaque Background pada thead & setiap th) */}
            <thead className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 shadow-xs">
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider select-none whitespace-nowrap text-[11px]">
                {/* 1. NO (Sticky top-0 left-0 z-50) */}
                <th
                  onClick={() => setSortField('id')}
                  className="py-3 px-2 text-center w-[50px] min-w-[50px] max-w-[50px] sticky top-0 left-0 z-50 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:text-emerald-600"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>NO</span>
                    {renderSortArrows('id')}
                  </div>
                </th>

                {/* 2. TANGGAL (Sticky top-0 left-[50px] z-50) */}
                <th
                  onClick={() => setSortField('tanggalDate')}
                  className="py-3 px-2 text-center w-[125px] min-w-[125px] max-w-[125px] sticky top-0 left-[50px] z-50 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:text-emerald-600"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>TANGGAL</span>
                    {renderSortArrows('tanggalDate')}
                  </div>
                </th>

                {/* 3. LOKASI (Sticky top-0 left-[175px] z-50, Width 115px to prevent overlap) */}
                <th
                  onClick={() => setSortField('lokasi')}
                  className="py-3 px-2 text-center w-[115px] min-w-[115px] max-w-[115px] sticky top-0 left-[175px] z-50 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:text-emerald-600"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>LOKASI</span>
                    {renderSortArrows('lokasi')}
                  </div>
                </th>

                {/* 4. LUAS NETTO (HA) (Sticky top-0 left-[290px] z-50, Width 130px) */}
                <th
                  onClick={() => setSortField('luasNetto')}
                  className="py-3 px-2 text-center w-[130px] min-w-[130px] max-w-[130px] sticky top-0 left-[290px] z-50 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:text-emerald-600"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>LUAS NETTO (HA)</span>
                    {renderSortArrows('luasNetto')}
                  </div>
                </th>

                {/* 5. AKTIVITAS (Sticky top-0 left-[420px] z-50, Width 130px with right border divider & shadow) */}
                <th
                  onClick={() => setSortField('aktivitas')}
                  className="py-3 px-2 text-center w-[130px] min-w-[130px] max-w-[130px] sticky top-0 left-[420px] z-50 bg-slate-100 dark:bg-slate-800 border-r-2 border-b border-slate-300 dark:border-slate-600 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)] dark:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.6)] cursor-pointer hover:text-emerald-600"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>AKTIVITAS</span>
                    {renderSortArrows('aktivitas')}
                  </div>
                </th>

                {/* 6. STANDAR (Sticky top-0 z-30 bg-slate-100 dark:bg-slate-800) */}
                <th
                  onClick={() => setSortField('standar')}
                  className="py-3 px-3 text-center sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:text-emerald-600"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>STANDAR</span>
                    {renderSortArrows('standar')}
                  </div>
                </th>

                {/* 7. BESAR (Sticky top-0 z-30 bg-slate-100 dark:bg-slate-800) */}
                <th
                  onClick={() => setSortField('besar')}
                  className="py-3 px-3 text-center sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:text-emerald-600"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>BESAR</span>
                    {renderSortArrows('besar')}
                  </div>
                </th>

                {/* 8. SEDANG (Sticky top-0 z-30 bg-slate-100 dark:bg-slate-800) */}
                <th
                  onClick={() => setSortField('sedang')}
                  className="py-3 px-3 text-center sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:text-emerald-600"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>SEDANG</span>
                    {renderSortArrows('sedang')}
                  </div>
                </th>

                {/* 9. KECIL (Sticky top-0 z-30 bg-slate-100 dark:bg-slate-800) */}
                <th
                  onClick={() => setSortField('kecil')}
                  className="py-3 px-3 text-center sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:text-emerald-600"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>KECIL</span>
                    {renderSortArrows('kecil')}
                  </div>
                </th>

                {/* 10. EXTRA KECIL (Sticky top-0 z-30 bg-slate-100 dark:bg-slate-800) */}
                <th
                  onClick={() => setSortField('extraKecil')}
                  className="py-3 px-3 text-center sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:text-emerald-600"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>EXTRA KECIL</span>
                    {renderSortArrows('extraKecil')}
                  </div>
                </th>

                {/* 11. TOTAL (HA) (Sticky top-0 z-30 bg-slate-100 dark:bg-slate-800) */}
                <th
                  onClick={() => setSortField('total')}
                  className="py-3 px-3 text-center sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:text-emerald-600 text-slate-800 dark:text-slate-100"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>TOTAL (HA)</span>
                    {renderSortArrows('total')}
                  </div>
                </th>

                {/* 12. JENIS BIBIT (Sticky top-0 z-30 bg-slate-100 dark:bg-slate-800) */}
                <th
                  onClick={() => setSortField('jenisBibit')}
                  className="py-3 px-3 text-center sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:text-emerald-600"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>JENIS BIBIT</span>
                    {renderSortArrows('jenisBibit')}
                  </div>
                </th>

                {/* 13. WILAYAH (Sticky top-0 z-30 bg-slate-100 dark:bg-slate-800) */}
                <th
                  onClick={() => setSortField('wilayah')}
                  className="py-3 px-3 text-center sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:text-emerald-600"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>WILAYAH</span>
                    {renderSortArrows('wilayah')}
                  </div>
                </th>

                {/* 14. AWAL TANAM (Sticky top-0 z-30 bg-slate-100 dark:bg-slate-800) */}
                <th
                  onClick={() => setSortField('awalTanam')}
                  className="py-3 px-3 text-center sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:text-emerald-600"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>AWAL TANAM</span>
                    {renderSortArrows('awalTanam')}
                  </div>
                </th>

                {/* 15. SELESAI TANAM (Sticky top-0 z-30 bg-slate-100 dark:bg-slate-800) */}
                <th
                  onClick={() => setSortField('selesaiTanam')}
                  className="py-3 px-3 text-center sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:text-emerald-600"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>SELESAI TANAM</span>
                    {renderSortArrows('selesaiTanam')}
                  </div>
                </th>

                {/* 16. AKUM TANAM (HA) (Sticky top-0 z-30 bg-slate-100 dark:bg-slate-800) */}
                <th
                  onClick={() => setSortField('akumTanam')}
                  className="py-3 px-3 text-center sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:text-emerald-600"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>AKUM TANAM (HA)</span>
                    {renderSortArrows('akumTanam')}
                  </div>
                </th>

                {/* 17. % TANAM (Sticky top-0 z-30 bg-slate-100 dark:bg-slate-800) */}
                <th
                  onClick={() => setSortField('persenTanam')}
                  className="py-3 px-3 text-center sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:text-emerald-600"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>% TANAM</span>
                    {renderSortArrows('persenTanam')}
                  </div>
                </th>

                {/* 18. PETIK KE- (Sticky top-0 z-30 bg-slate-100 dark:bg-slate-800) */}
                <th
                  onClick={() => setSortField('petikKe')}
                  className="py-3 px-3 text-center sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:text-emerald-600"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>PETIK KE-</span>
                    {renderSortArrows('petikKe')}
                  </div>
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={18} className="py-20 text-center">
                    <div className="inline-flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                      <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium">Memuat data transaksi...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={18} className="py-16 text-center text-rose-500 text-xs">
                    <p className="font-semibold">{error}</p>
                    <button
                      onClick={fetchData}
                      className="mt-2 px-3 py-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      Coba Lagi
                    </button>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
                    <p className="font-medium text-slate-600 dark:text-slate-300">
                      Tidak ada data transaksi yang cocok dengan filter.
                    </p>
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => {
                  const rowNumber = (page - 1) * limit + idx + 1;
                  const isEditing = (field: string) =>
                    editingCell?.id === item.id && editingCell?.field === field;
                  const isSaving = (field: string) =>
                    savingCell?.id === item.id && savingCell?.field === field;
                  const isSavedSuccess = (field: string) =>
                    savedSuccessCell?.id === item.id && savedSuccessCell?.field === field;

                  const cellClass = (field: string, extra = '') => {
                    let base = `${extra} transition-colors `;
                    if (isSavedSuccess(field)) {
                      base += 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 ';
                    } else if (isSaving(field)) {
                      base += 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 opacity-70 ';
                    }
                    return base;
                  };

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap group"
                    >
                      {/* 1. NO (Sticky left-0, 100% Solid Background) */}
                      <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 sticky left-0 z-20 w-[50px] min-w-[50px] max-w-[50px] bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-800">
                        {rowNumber}
                      </td>

                      {/* 2. TANGGAL (Sticky left-[50px], Editable via TableDatePicker) */}
                      <td className={`py-1.5 px-2 text-center font-mono sticky left-[50px] z-20 w-[125px] min-w-[125px] max-w-[125px] bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-800 ${cellClass('tanggal')}`}>
                        <div className="flex items-center justify-center">
                          <TableDatePicker
                            value={item.tanggal}
                            align="center"
                            onChange={(newDate) => handleSaveEdit(item, 'tanggal', newDate)}
                          />
                        </div>
                      </td>

                      {/* 3. LOKASI (Sticky left-[175px], Read-only, Width 115px) */}
                      <td className="py-2 px-2.5 text-center font-bold text-slate-800 dark:text-slate-100 font-mono tracking-tight sticky left-[175px] z-20 w-[115px] min-w-[115px] max-w-[115px] bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-800">
                        {item.lokasi}
                      </td>

                      {/* 4. LUAS NETTO (HA) (Sticky left-[290px], Inline editable, Width 130px) */}
                      <td
                        onClick={() => startEdit(item, 'luasNetto')}
                        className={`py-2 px-2.5 text-center font-mono cursor-pointer sticky left-[290px] z-20 w-[130px] min-w-[130px] max-w-[130px] bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-800 ${cellClass('luasNetto', 'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40')}`}
                        title="Klik untuk mengedit Luas Netto"
                      >
                        {isEditing('luasNetto') ? (
                          <input
                            ref={inputRef}
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item, 'luasNetto', editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(item, 'luasNetto', editValue);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-20 text-center px-1.5 py-0.5 text-xs bg-white dark:bg-slate-800 border border-emerald-500 rounded font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        ) : (
                          <span>{item.luasNetto !== null ? item.luasNetto.toFixed(2) : '-'}</span>
                        )}
                      </td>

                      {/* 5. AKTIVITAS (Sticky left-[420px], Dropdown Inline Editable, Divider Shadow) */}
                      <td
                        className={`py-1.5 px-2 text-center sticky left-[420px] z-20 w-[130px] min-w-[130px] max-w-[130px] bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r-2 border-b border-slate-300 dark:border-slate-700 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)] dark:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.6)] ${cellClass('aktivitas')}`}
                      >
                        {isEditing('aktivitas') ? (
                          <select
                            autoFocus
                            value={item.aktivitas || 'Tanam Bibit'}
                            onBlur={() => setEditingCell(null)}
                            onChange={(e) => handleSaveEdit(item, 'aktivitas', e.target.value)}
                            className="w-full py-1 px-1.5 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 border border-emerald-500 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-xs"
                          >
                            {AKTIVITAS_LIST.map((akt) => (
                              <option key={akt} value={akt}>
                                {akt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            onClick={() => startEdit(item, 'aktivitas')}
                            className="cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-block font-semibold text-slate-700 dark:text-slate-200"
                            title="Klik untuk memilih aktivitas"
                          >
                            {item.aktivitas || '-'}
                          </span>
                        )}
                      </td>

                      {/* 6. STANDAR (Inline editable) */}
                      <td
                        onClick={() => startEdit(item, 'standar')}
                        className={`py-2 px-3 text-center font-mono cursor-pointer border-r border-b border-slate-200 dark:border-slate-800 ${cellClass('standar', 'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-400')}`}
                        title="Klik untuk mengedit Standar"
                      >
                        {isEditing('standar') ? (
                          <input
                            ref={inputRef}
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item, 'standar', editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(item, 'standar', editValue);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-20 text-center px-1.5 py-0.5 text-xs bg-white dark:bg-slate-800 border border-emerald-500 rounded font-mono focus:outline-none"
                          />
                        ) : (
                          <span>{item.standar ? item.standar.toFixed(2) : '-'}</span>
                        )}
                      </td>

                      {/* 7. BESAR (Inline editable) */}
                      <td
                        onClick={() => startEdit(item, 'besar')}
                        className={`py-2 px-3 text-center font-mono cursor-pointer border-r border-b border-slate-200 dark:border-slate-800 ${cellClass('besar', 'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-400')}`}
                        title="Klik untuk mengedit Besar"
                      >
                        {isEditing('besar') ? (
                          <input
                            ref={inputRef}
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item, 'besar', editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(item, 'besar', editValue);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-20 text-center px-1.5 py-0.5 text-xs bg-white dark:bg-slate-800 border border-emerald-500 rounded font-mono focus:outline-none"
                          />
                        ) : (
                          <span>{item.besar ? item.besar.toFixed(2) : '-'}</span>
                        )}
                      </td>

                      {/* 8. SEDANG (Inline editable) */}
                      <td
                        onClick={() => startEdit(item, 'sedang')}
                        className={`py-2 px-3 text-center font-mono cursor-pointer border-r border-b border-slate-200 dark:border-slate-800 ${cellClass('sedang', 'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-400')}`}
                        title="Klik untuk mengedit Sedang"
                      >
                        {isEditing('sedang') ? (
                          <input
                            ref={inputRef}
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item, 'sedang', editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(item, 'sedang', editValue);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-20 text-center px-1.5 py-0.5 text-xs bg-white dark:bg-slate-800 border border-emerald-500 rounded font-mono focus:outline-none"
                          />
                        ) : (
                          <span>{item.sedang ? item.sedang.toFixed(2) : '-'}</span>
                        )}
                      </td>

                      {/* 9. KECIL (Inline editable) */}
                      <td
                        onClick={() => startEdit(item, 'kecil')}
                        className={`py-2 px-3 text-center font-mono cursor-pointer border-r border-b border-slate-200 dark:border-slate-800 ${cellClass('kecil', 'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-400')}`}
                        title="Klik untuk mengedit Kecil"
                      >
                        {isEditing('kecil') ? (
                          <input
                            ref={inputRef}
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item, 'kecil', editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(item, 'kecil', editValue);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-20 text-center px-1.5 py-0.5 text-xs bg-white dark:bg-slate-800 border border-emerald-500 rounded font-mono focus:outline-none"
                          />
                        ) : (
                          <span>{item.kecil ? item.kecil.toFixed(2) : '-'}</span>
                        )}
                      </td>

                      {/* 10. EXTRA KECIL (Inline editable) */}
                      <td
                        onClick={() => startEdit(item, 'extraKecil')}
                        className={`py-2 px-3 text-center font-mono cursor-pointer border-r border-b border-slate-200 dark:border-slate-800 ${cellClass('extraKecil', 'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-400')}`}
                        title="Klik untuk mengedit Extra Kecil"
                      >
                        {isEditing('extraKecil') ? (
                          <input
                            ref={inputRef}
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item, 'extraKecil', editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(item, 'extraKecil', editValue);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-20 text-center px-1.5 py-0.5 text-xs bg-white dark:bg-slate-800 border border-emerald-500 rounded font-mono focus:outline-none"
                          />
                        ) : (
                          <span>{item.extraKecil ? item.extraKecil.toFixed(2) : '-'}</span>
                        )}
                      </td>

                      {/* 11. TOTAL (HA) (Inline editable) */}
                      <td
                        onClick={() => startEdit(item, 'total')}
                        className={`py-2 px-3 text-center font-mono font-bold cursor-pointer bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-r border-b border-slate-200 dark:border-slate-800 ${cellClass('total', 'hover:bg-emerald-100/50')}`}
                        title="Klik untuk mengedit Total Ha"
                      >
                        {isEditing('total') ? (
                          <input
                            ref={inputRef}
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item, 'total', editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(item, 'total', editValue);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-20 text-center px-1.5 py-0.5 text-xs bg-white dark:bg-slate-800 border border-emerald-500 rounded font-mono focus:outline-none"
                          />
                        ) : (
                          <span>{item.total ? item.total.toFixed(2) : '0.00'}</span>
                        )}
                      </td>

                      {/* 12. JENIS BIBIT (Dropdown Inline Editable: No arrow initially, select shown on click) */}
                      <td className={`py-1.5 px-3 text-center border-r border-b border-slate-200 dark:border-slate-800 ${cellClass('jenisBibit')}`}>
                        {isEditing('jenisBibit') ? (
                          <select
                            autoFocus
                            value={item.jenisBibit || 'Crown'}
                            onBlur={() => setEditingCell(null)}
                            onChange={(e) => handleSaveEdit(item, 'jenisBibit', e.target.value)}
                            className="py-1 px-2 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 border border-emerald-500 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-xs"
                          >
                            {JENIS_BIBIT_LIST.map((jb) => (
                              <option key={jb} value={jb}>
                                {jb}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            onClick={() => startEdit(item, 'jenisBibit')}
                            className="cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-block font-semibold text-slate-700 dark:text-slate-200"
                            title="Klik untuk memilih jenis bibit"
                          >
                            {item.jenisBibit || '-'}
                          </span>
                        )}
                      </td>

                      {/* 13. WILAYAH (Dropdown Inline Editable: No arrow initially, select shown on click) */}
                      <td className={`py-1.5 px-3 text-center border-r border-b border-slate-200 dark:border-slate-800 ${cellClass('wilayah')}`}>
                        {isEditing('wilayah') ? (
                          <select
                            autoFocus
                            value={item.wilayah || 'W01'}
                            onBlur={() => setEditingCell(null)}
                            onChange={(e) => handleSaveEdit(item, 'wilayah', e.target.value)}
                            className="py-1 px-2 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 border border-emerald-500 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-xs"
                          >
                            {WILAYAH_LIST.map((w) => (
                              <option key={w} value={w}>
                                {w}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            onClick={() => startEdit(item, 'wilayah')}
                            className="cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-block font-semibold text-slate-700 dark:text-slate-200"
                            title="Klik untuk memilih wilayah"
                          >
                            {item.wilayah || '-'}
                          </span>
                        )}
                      </td>

                      {/* 14. AWAL TANAM (Editable via TableDatePicker) */}
                      <td className={`py-1.5 px-3 text-center font-mono border-r border-b border-slate-200 dark:border-slate-800 ${cellClass('awalTanam')}`}>
                        <div className="flex items-center justify-center">
                          <TableDatePicker
                            value={item.awalTanam}
                            align="center"
                            onChange={(newDate) => handleSaveEdit(item, 'awalTanam', newDate)}
                          />
                        </div>
                      </td>

                      {/* 15. SELESAI TANAM (Editable via TableDatePicker) */}
                      <td className={`py-1.5 px-3 text-center font-mono border-r border-b border-slate-200 dark:border-slate-800 ${cellClass('selesaiTanam')}`}>
                        <div className="flex items-center justify-center">
                          <TableDatePicker
                            value={item.selesaiTanam}
                            align="center"
                            onChange={(newDate) => handleSaveEdit(item, 'selesaiTanam', newDate)}
                          />
                        </div>
                      </td>

                      {/* 16. AKUM TANAM (HA) (Inline editable) */}
                      <td
                        onClick={() => startEdit(item, 'akumTanam')}
                        className={`py-2 px-3 text-center font-mono cursor-pointer border-r border-b border-slate-200 dark:border-slate-800 ${cellClass('akumTanam', 'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-400')}`}
                        title="Klik untuk mengedit Akum Tanam"
                      >
                        {isEditing('akumTanam') ? (
                          <input
                            ref={inputRef}
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item, 'akumTanam', editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(item, 'akumTanam', editValue);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-20 text-center px-1.5 py-0.5 text-xs bg-white dark:bg-slate-800 border border-emerald-500 rounded font-mono focus:outline-none"
                          />
                        ) : (
                          <span>{item.akumTanam ? item.akumTanam.toFixed(2) : '-'}</span>
                        )}
                      </td>

                      {/* 17. % TANAM (Inline editable) */}
                      <td
                        onClick={() => startEdit(item, 'persenTanam')}
                        className={`py-2 px-3 text-center font-mono cursor-pointer border-r border-b border-slate-200 dark:border-slate-800 ${cellClass('persenTanam', 'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-400')}`}
                        title="Klik untuk mengedit % Tanam"
                      >
                        {isEditing('persenTanam') ? (
                          <input
                            ref={inputRef}
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item, 'persenTanam', editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(item, 'persenTanam', editValue);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-20 text-center px-1.5 py-0.5 text-xs bg-white dark:bg-slate-800 border border-emerald-500 rounded font-mono focus:outline-none"
                          />
                        ) : (
                          <span>
                            {item.persenTanam !== null && item.persenTanam > 0
                              ? `${(item.persenTanam * 100).toFixed(1)}%`
                              : '-'}
                          </span>
                        )}
                      </td>

                      {/* 18. PETIK KE- (Inline editable) */}
                      <td
                        onClick={() => startEdit(item, 'petikKe')}
                        className={`py-2 px-3 text-center font-mono cursor-pointer border-b border-slate-200 dark:border-slate-800 ${cellClass('petikKe', 'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 text-slate-500')}`}
                        title="Klik untuk mengedit Petik Ke"
                      >
                        {isEditing('petikKe') ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(item, 'petikKe', editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(item, 'petikKe', editValue);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-16 text-center px-1.5 py-0.5 text-xs bg-white dark:bg-slate-800 border border-emerald-500 rounded font-mono focus:outline-none"
                          />
                        ) : (
                          <span>{item.petikKe || '-'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Bar (Persis Tabel Data Lahan: Prev & Next Saja) */}
        <div className="py-3 px-4 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Sisi Kiri: Tampilkan per halaman & Halaman X dari Y */}
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span>Tampilkan per halaman:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="py-1 px-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>

            <span className="text-slate-300 dark:text-slate-700">|</span>

            <span>
              Halaman <strong className="text-slate-800 dark:text-slate-100">{total > 0 ? page : 0}</strong> dari{' '}
              <strong className="text-slate-800 dark:text-slate-100">{totalPages}</strong>
            </span>
          </div>

          {/* Sisi Kanan: Kontrol Navigasi Prev & Next Saja (Persis Tabel Data Lahan) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed shadow-xs font-medium transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed shadow-xs font-medium transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
