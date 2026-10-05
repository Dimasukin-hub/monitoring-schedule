'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Sprout,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronDown as ChevronDownIcon,
  Download,
  AlertCircle,
  Layers,
  MapPin,
  CalendarDays,
  FileSpreadsheet,
  Percent,
  CheckCheck,
  XCircle,
  X,
  RotateCcw,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface PlantingItem {
  id: number;
  lokasi: string;
  luas: number;
  jenisBibit: string | null;
  kelasBibit: string | null;
  realTanam: number | null;
  sisa: number | null;
  estSelesai: string | null;
  progress: number | null;
  awalTanam: string | null;
  leadtime: number | null;
  status: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface PlantingSummary {
  totalLokasi: number;
  totalLuas: number;
  totalRealTanam: number;
  totalSisa: number;
  avgProgress: number;
  avgLeadtime: number;
  selesaiCount: number;
  prosesCount: number;
  belumCount: number;
}

interface PlantingViewProps {
  onOpenLand?: (lokasi: string) => void;
  refreshTrigger?: number;
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Helper Parse Tanggal Format RTN (e.g. "16-Sep-26" atau "2026-09-16")
function parseRtnDate(str: string | null | undefined): Date | null {
  if (!str || str === '-' || str.trim() === '') return null;
  const s = str.trim();

  // "16-Sep-26"
  const dashParts = s.split('-');
  if (dashParts.length === 3) {
    if (isNaN(Number(dashParts[0]))) {
      // YYYY-MM-DD
      const y = parseInt(dashParts[0], 10);
      const m = parseInt(dashParts[1], 10) - 1;
      const d = parseInt(dashParts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
    } else {
      // D-MMM-YY
      const d = parseInt(dashParts[0], 10);
      const mStr = dashParts[1].toLowerCase().slice(0, 3);
      let y = parseInt(dashParts[2], 10);
      if (y < 100) y += 2000;
      const mIdx = MONTHS_EN.findIndex((m) => m.toLowerCase().slice(0, 3) === mStr);
      if (!isNaN(d) && mIdx !== -1 && !isNaN(y)) {
        return new Date(y, mIdx, d);
      }
    }
  }

  const dObj = new Date(s);
  return isNaN(dObj.getTime()) ? null : dObj;
}

function formatToRtnDate(d: Date): string {
  const day = d.getDate();
  const m = MONTHS_EN[d.getMonth()];
  const y = String(d.getFullYear()).slice(-2);
  return `${day}-${m}-${y}`;
}

export default function PlantingView({ onOpenLand, refreshTrigger = 0 }: PlantingViewProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Data State
  const [data, setData] = useState<PlantingItem[]>([]);
  const [summary, setSummary] = useState<PlantingSummary>({
    totalLokasi: 0,
    totalLuas: 0,
    totalRealTanam: 0,
    totalSisa: 0,
    avgProgress: 0,
    avgLeadtime: 0,
    selesaiCount: 0,
    prosesCount: 0,
    belumCount: 0,
  });

  // Filter & Pagination States
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedJenis, setSelectedJenis] = useState<string[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(15);
  const [pagination, setPagination] = useState<{ total: number; totalPages: number }>({
    total: 0,
    totalPages: 1,
  });

  // Filter Dropdown Open State
  const [openDropdown, setOpenDropdown] = useState<'jenis' | 'kelas' | 'status' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Inline Editing States (Number/Select)
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedSuccessCell, setSavedSuccessCell] = useState<{ id: number; field: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Date Picker Hover State (Poin 3: Muncul saat kursor diarahkan ke datanya)
  interface HoverDatePickerState {
    id: number;
    field: string;
    currentDate: Date;
    x: number;
    y: number;
  }
  const [hoverDatePicker, setHoverDatePicker] = useState<HoverDatePickerState | null>(null);
  const [pickerViewMonth, setPickerViewMonth] = useState<Date>(new Date());
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modal Detail State (jika klik badge lokasi)
  const [selectedItem, setSelectedItem] = useState<PlantingItem | null>(null);

  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  // Auto-focus input saat inline edit aktif
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch API Function
  const fetchPlantingData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        jenisBibit: selectedJenis.length > 0 ? selectedJenis.join(',') : 'ALL',
        kelasBibit: selectedKelas.length > 0 ? selectedKelas.join(',') : 'ALL',
        status: selectedStatus.length > 0 ? selectedStatus.join(',') : 'ALL',
        sortBy,
        sortOrder,
      });

      const res = await fetch(`/api/planting?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setData(json.data || []);
        if (json.summary) setSummary(json.summary);
        if (json.pagination) {
          setPagination({
            total: json.pagination.total,
            totalPages: json.pagination.totalPages,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load planting data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlantingData();
  }, [page, limit, search, selectedJenis, selectedKelas, selectedStatus, sortBy, sortOrder, refreshTrigger]);

  // Handle Sort Toggle
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Start Inline Editing for text/number/select
  const startEdit = (item: PlantingItem, field: string) => {
    setHoverDatePicker(null);
    setEditingCell({ id: item.id, field });
    setEditValue(item[field as keyof PlantingItem] ?? '');
  };

  // Cancel Inline Editing
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Hover Handlers for Date Picker (Poin 3)
  const handleDateCellMouseEnter = (
    e: React.MouseEvent<HTMLTableCellElement>,
    item: PlantingItem,
    field: string
  ) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const existingDate = parseRtnDate(item[field as keyof PlantingItem] as string) || new Date();

    // Tentukan koordinat popover di bawah/atas sel
    const popoverHeight = 280;
    const showAbove = rect.bottom + popoverHeight > window.innerHeight && rect.top > popoverHeight;
    const y = showAbove ? rect.top - popoverHeight - 4 : rect.bottom + 4;
    const x = Math.max(10, Math.min(window.innerWidth - 300, rect.left + rect.width / 2 - 140));

    setHoverDatePicker({
      id: item.id,
      field,
      currentDate: existingDate,
      x,
      y,
    });
    setPickerViewMonth(new Date(existingDate.getFullYear(), existingDate.getMonth(), 1));
  };

  const handleDateCellMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setHoverDatePicker(null);
    }, 280);
  };

  const handlePickerMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handlePickerMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setHoverDatePicker(null);
    }, 200);
  };

  // Save Inline Editing dengan Live Formula & API Update
  const saveInlineEdit = async (item: PlantingItem, field: string, newValue: any) => {
    const oldValue = item[field as keyof PlantingItem] ?? '';
    if (String(newValue).trim() === String(oldValue).trim()) {
      cancelEdit();
      return;
    }

    setSavingId(item.id);
    cancelEdit();

    // Hitung live kalkulasi optimis di frontend
    let newLuas = item.luas;
    let newReal = item.realTanam || 0;
    let newJenis = item.jenisBibit;
    let newKelas = item.kelasBibit;
    let newAwal = item.awalTanam;
    let newEst = item.estSelesai;

    if (field === 'luas') newLuas = Number(parseFloat(newValue) || 0);
    if (field === 'realTanam') newReal = Number(parseFloat(newValue) || 0);
    if (field === 'jenisBibit') newJenis = newValue || null;
    if (field === 'kelasBibit') newKelas = newValue || null;
    if (field === 'awalTanam') newAwal = newValue || null;
    if (field === 'estSelesai') newEst = newValue || null;

    // Rumus Sisa: Real Tanam - Luas
    const sisa = Number((newReal - newLuas).toFixed(2));
    // Rumus Progress: (Real Tanam / Luas) * 100
    const progress = newLuas > 0 ? Number(((newReal / newLuas) * 100).toFixed(1)) : 0;
    let status = 'BELUM TANAM';
    if (progress >= 100 || (newLuas > 0 && newReal >= newLuas) || (Math.abs(sisa) <= 0.05 && newReal > 0)) {
      status = 'SELESAI';
    } else if (newReal > 0 || (progress > 0 && progress < 100)) {
      status = 'PROSES';
    }

    // Optimistic Update
    setData((prev) =>
      prev.map((row) =>
        row.id === item.id
          ? {
              ...row,
              [field]: field === 'luas' ? newLuas : field === 'realTanam' ? newReal : newValue,
              sisa,
              progress,
              status,
              jenisBibit: newJenis,
              kelasBibit: newKelas,
              awalTanam: newAwal,
              estSelesai: newEst,
            }
          : row
      )
    );

    try {
      const payload: any = { id: item.id };
      if (field === 'luas') payload.luas = newLuas;
      else if (field === 'realTanam') payload.realTanam = newReal;
      else if (field === 'jenisBibit') payload.jenisBibit = newJenis;
      else if (field === 'kelasBibit') payload.kelasBibit = newKelas;
      else if (field === 'awalTanam') payload.awalTanam = newAwal;
      else if (field === 'estSelesai') payload.estSelesai = newEst;

      const res = await fetch('/api/planting', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setData((prev) =>
          prev.map((row) => (row.id === item.id ? { ...row, ...json.data } : row))
        );

        setSavedSuccessCell({ id: item.id, field });
        setTimeout(() => setSavedSuccessCell(null), 2500);

        setToastMessage(`✓ Lokasi ${item.lokasi} berhasil disimpan`);
        setTimeout(() => setToastMessage(null), 3000);

        fetchPlantingData();
      } else {
        alert(json.error || 'Gagal menyimpan perubahan.');
        fetchPlantingData();
      }
    } catch (err) {
      console.error('Error saving inline edit:', err);
      alert('Terjadi kesalahan jaringan saat menyimpan.');
      fetchPlantingData();
    } finally {
      setSavingId(null);
    }
  };

  // Export SELURUH Data ke Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        all: 'true',
        search,
        jenisBibit: selectedJenis.length > 0 ? selectedJenis.join(',') : 'ALL',
        kelasBibit: selectedKelas.length > 0 ? selectedKelas.join(',') : 'ALL',
        status: selectedStatus.length > 0 ? selectedStatus.join(',') : 'ALL',
        sortBy,
        sortOrder,
      });

      const res = await fetch(`/api/planting?${params.toString()}`);
      const json = await res.json();

      if (!json.success || !json.data || json.data.length === 0) {
        alert('Tidak ada data untuk diekspor.');
        return;
      }

      const allItems: PlantingItem[] = json.data;

      const headers = [
        'NO',
        'LOKASI',
        'LUAS (HA)',
        'JENIS BIBIT',
        'KELAS BIBIT',
        'REAL TANAM (HA)',
        'SISA (HA)',
        'EST. SELESAI',
        'PROGRESS (%)',
        'AWAL TANAM',
        'LEADTIME (HARI)',
        'STATUS',
      ];

      const sheetData = [
        headers,
        ...allItems.map((item, idx) => [
          idx + 1,
          item.lokasi,
          item.luas !== null ? Number(item.luas.toFixed(2)) : 0,
          item.jenisBibit || '-',
          item.kelasBibit || '-',
          item.realTanam !== null ? Number(item.realTanam.toFixed(2)) : 0,
          item.sisa !== null ? Number(item.sisa.toFixed(2)) : 0,
          item.estSelesai || '-',
          item.progress !== null ? `${item.progress}%` : '0%',
          item.awalTanam || '-',
          item.leadtime !== null ? item.leadtime : '-',
          item.status || 'BELUM TANAM',
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      ws['!cols'] = [
        { wch: 6 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 12 },
        { wch: 15 },
        { wch: 14 },
        { wch: 15 },
        { wch: 16 },
        { wch: 14 },
      ];

      // Freeze Panes Baris Header (Kolom NO sampai STATUS)
      ws['!views'] = [{ state: 'frozen', ySplit: 1 }];
      ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Real Tanam Nanas');

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Planting_Real_Tanam_Nanas_${dateStr}.xlsx`);
    } catch (err) {
      console.error('Error exporting excel:', err);
      alert('Gagal mengekspor data ke Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper Badge Colors for Seed
  const getJenisBadge = (jenis: string | null) => {
    if (!jenis) return <span className="text-slate-400 italic">Pilih</span>;
    const isCrown = jenis.toLowerCase().includes('crown');
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all ${
          isCrown
            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
        }`}
      >
        {jenis}
      </span>
    );
  };

  const getKelasBadge = (kelas: string | null) => {
    if (!kelas) return <span className="text-slate-400 italic">Pilih</span>;
    let colorCls = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    if (kelas.toLowerCase().includes('besar')) {
      colorCls = 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    } else if (kelas.toLowerCase().includes('sedang')) {
      colorCls = 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20';
    } else if (kelas.toLowerCase().includes('extra')) {
      colorCls = 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
    } else if (kelas.toLowerCase().includes('kecil')) {
      colorCls = 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20';
    }

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all ${colorCls}`}
      >
        {kelas}
      </span>
    );
  };

  // Helper Header Sort Icon (Poin 1: Tengah & Poin 7: Sort Panah)
  const renderSortArrows = (field: string) => {
    const isFieldActive = sortBy === field;
    return (
      <span className="inline-flex flex-col ml-1 shrink-0">
        <span
          role="button"
          tabIndex={0}
          title={field === 'id' ? 'Urutan angka awal 1 (Naik)' : 'Urutkan Naik'}
          onClick={(e) => {
            e.stopPropagation();
            setSortBy(field);
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
          title={field === 'id' ? 'Urutan angka paling akhir (Turun)' : 'Urutkan Turun'}
          onClick={(e) => {
            e.stopPropagation();
            setSortBy(field);
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

  // Calendar Day Rendering for Popover Date Picker (Poin 3)
  const renderCalendarDays = () => {
    if (!hoverDatePicker) return null;
    const year = pickerViewMonth.getFullYear();
    const month = pickerViewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const selectedD = hoverDatePicker.currentDate;
    const isSameYearMonth = selectedD.getFullYear() === year && selectedD.getMonth() === month;

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-7 h-7" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const isSelected = isSameYearMonth && selectedD.getDate() === d;
      const thisDate = new Date(year, month, d);

      days.push(
        <button
          key={`day-${d}`}
          type="button"
          onClick={() => {
            const rowItem = data.find((r) => r.id === hoverDatePicker.id);
            if (rowItem) {
              const formatted = formatToRtnDate(thisDate);
              saveInlineEdit(rowItem, hoverDatePicker.field, formatted);
            }
            setHoverDatePicker(null);
          }}
          className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800'
          }`}
        >
          {d}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900/95 dark:bg-emerald-950/90 text-white shadow-2xl border border-emerald-500/40 backdrop-blur-md text-sm font-medium animate-in slide-in-from-bottom-4 duration-300">
          <CheckCheck className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Banner & Title */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-10 h-48 w-48 rounded-full bg-teal-500/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sprout className="w-9 h-9 text-emerald-300 shrink-0" />
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Monitoring Planting - Real Tanam Nanas
            </h1>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-900 font-bold text-sm transition-all shadow-md disabled:opacity-50"
              title="Download Seluruh Data Tabel dalam Format Excel"
            >
              <FileSpreadsheet className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Mengunduh Excel...' : 'Download Excel'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Highlights Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Lokasi */}
        <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Total Lokasi</span>
            <MapPin className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-100">
            {summary.totalLokasi.toLocaleString('id-ID')}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{summary.selesaiCount}</span> Selesai &bull;{' '}
            <span className="text-amber-600 dark:text-amber-400 font-semibold">{summary.prosesCount}</span> Proses
          </div>
        </div>

        {/* Total Luas Lahan */}
        <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Total Luas</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-100">
            {summary.totalLuas.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            <span className="text-xs font-medium text-slate-400 ml-1">Ha</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">Akumulasi luas target</div>
        </div>

        {/* Realisasi Tanam */}
        <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Real Tanam</span>
            <Sprout className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {summary.totalRealTanam.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            <span className="text-xs font-medium text-slate-400 ml-1">Ha</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">Realisasi tertanam</div>
        </div>

        {/* Sisa Luas */}
        <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Sisa Tanam</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-100">
            {summary.totalSisa.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            <span className="text-xs font-medium text-slate-400 ml-1">Ha</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {summary.totalSisa <= 0 ? 'Target terpenuhi' : 'Belum tertanam'}
          </div>
        </div>

        {/* Rata-rata Progress */}
        <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Rerata Progress</span>
            <Percent className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-100">
            {summary.avgProgress}%
          </div>
          <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary.avgProgress)}%` }}
            />
          </div>
        </div>

        {/* Rata-rata Leadtime */}
        <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Rerata Leadtime</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-100">
            {summary.avgLeadtime}
            <span className="text-xs font-medium text-slate-400 ml-1">Hari</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">Durasi pengerjaan</div>
        </div>
      </div>

      {/* 3. Search & Multi-Centang Filters Toolbar (Poin 2 & Poin 4) */}
      <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center gap-3" ref={dropdownRef}>
        {/* Search input (Cari lokasi saja + Tombol Silang Bulat) */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari lokasi"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-10 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
              title="Hapus pencarian"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Multi-Select Filters Menyamping Rapi + Tombol Reset & Pilih Semua (Poin 2) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* FILTER: Jenis Bibit */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'jenis' ? null : 'jenis')}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                selectedJenis.length > 0
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>{selectedJenis.length > 0 ? `Jenis Bibit (${selectedJenis.length})` : 'Jenis Bibit'}</span>
              <ChevronDownIcon className="w-3.5 h-3.5 opacity-60" />
            </button>

            {openDropdown === 'jenis' && (
              <div className="absolute left-0 mt-2 z-40 w-max max-w-[calc(100vw-2.5rem)] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedJenis(['Crown', 'Sucker']);
                      setPage(1);
                    }}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Pilih Semua
                  </button>
                  {selectedJenis.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedJenis([]);
                        setPage(1);
                      }}
                      className="text-xs font-semibold text-red-500 hover:underline flex items-center gap-0.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* 2 Kotak Data Disejajarkan Rapi & Ukuran Pas */}
                <div className="grid grid-cols-2 gap-2 whitespace-nowrap">
                  {['Crown', 'Sucker'].map((jb) => {
                    const isChecked = selectedJenis.includes(jb);
                    return (
                      <label
                        key={jb}
                        className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-xs font-medium select-none transition-all ${
                          isChecked
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300 font-semibold shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedJenis([...selectedJenis, jb]);
                            } else {
                              setSelectedJenis(selectedJenis.filter((v) => v !== jb));
                            }
                            setPage(1);
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                        />
                        <span>{jb}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* FILTER: Kelas Bibit (Ukuran Pas & 4 Kotak Data Disejajarkan Rapi) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'kelas' ? null : 'kelas')}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                selectedKelas.length > 0
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>{selectedKelas.length > 0 ? `Kelas Bibit (${selectedKelas.length})` : 'Kelas Bibit'}</span>
              <ChevronDownIcon className="w-3.5 h-3.5 opacity-60" />
            </button>

            {openDropdown === 'kelas' && (
              <div className="absolute right-0 mt-2 z-40 w-max max-w-[calc(100vw-2.5rem)] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedKelas(['Besar', 'Sedang', 'Kecil', 'Extra Kecil']);
                      setPage(1);
                    }}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Pilih Semua
                  </button>
                  {selectedKelas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedKelas([]);
                        setPage(1);
                      }}
                      className="text-xs font-semibold text-red-500 hover:underline flex items-center gap-0.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* 4 Kotak Data Disejajarkan Rapi & Ukuran Pas */}
                <div className="grid grid-cols-4 gap-2 whitespace-nowrap">
                  {['Besar', 'Sedang', 'Kecil', 'Extra Kecil'].map((kb) => {
                    const isChecked = selectedKelas.includes(kb);
                    return (
                      <label
                        key={kb}
                        className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs font-medium select-none transition-all ${
                          isChecked
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300 font-semibold shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedKelas([...selectedKelas, kb]);
                            } else {
                              setSelectedKelas(selectedKelas.filter((v) => v !== kb));
                            }
                            setPage(1);
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                        />
                        <span>{kb}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* FILTER: Status (Ukuran Pas & 3 Kotak Data Disejajarkan Rapi) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                selectedStatus.length > 0
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>{selectedStatus.length > 0 ? `Status (${selectedStatus.length})` : 'Status'}</span>
              <ChevronDownIcon className="w-3.5 h-3.5 opacity-60" />
            </button>

            {openDropdown === 'status' && (
              <div className="absolute right-0 mt-2 z-40 w-max max-w-[calc(100vw-2.5rem)] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStatus(['SELESAI', 'PROSES', 'BELUM TANAM']);
                      setPage(1);
                    }}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Pilih Semua
                  </button>
                  {selectedStatus.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatus([]);
                        setPage(1);
                      }}
                      className="text-xs font-semibold text-red-500 hover:underline flex items-center gap-0.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* 3 Kotak Data Disejajarkan Rapi & Ukuran Pas */}
                <div className="grid grid-cols-3 gap-2 whitespace-nowrap">
                  {[
                    { val: 'SELESAI', label: 'Selesai' },
                    { val: 'PROSES', label: 'Proses' },
                    { val: 'BELUM TANAM', label: 'Belum Tanam' },
                  ].map((st) => {
                    const isChecked = selectedStatus.includes(st.val);
                    return (
                      <label
                        key={st.val}
                        className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs font-medium select-none transition-all ${
                          isChecked
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300 font-semibold shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStatus([...selectedStatus, st.val]);
                            } else {
                              setSelectedStatus(selectedStatus.filter((v) => v !== st.val));
                            }
                            setPage(1);
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                        />
                        <span>{st.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Reset Filters Toolbar Utama */}
          {(selectedJenis.length > 0 || selectedKelas.length > 0 || selectedStatus.length > 0 || search) && (
            <button
              type="button"
              onClick={() => {
                setSelectedJenis([]);
                setSelectedKelas([]);
                setSelectedStatus([]);
                setSearch('');
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors border border-red-200 dark:border-red-900/40"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 4. Table RTN (Update Real Tanam Nanas: Lokasi s/d Leadtime) */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Header Baris Tabel (Poin 4: Hapus tulisan 362 Lokasi) */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Tabel Real Tanam Nanas
            </span>
            {savingId && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse ml-2">
                <Clock className="w-3 h-3 animate-spin" />
                Menghitung rumus &amp; menyimpan...
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400">
            Halaman {page} dari {pagination.totalPages}
          </div>
        </div>

        {/* Tabel Freeze Panes (Header Kolom NO sampai STATUS Tetap Membeku di Atas) */}
        <div className="overflow-auto scroll-smooth max-h-[calc(100vh-280px)] min-h-[420px] relative">
          <table className="w-full text-center text-xs min-w-[1320px] border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider shadow-sm">
              <tr>
                {/* NO */}
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-3 w-16 text-center cursor-pointer hover:text-emerald-600 transition-colors whitespace-nowrap bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800"
                  title="Urutkan No"
                >
                  <div className="inline-flex items-center justify-center gap-1">
                    <span>NO</span>
                    {renderSortArrows('id')}
                  </div>
                </th>

                {/* Lokasi */}
                <th
                  onClick={() => handleSort('lokasi')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-emerald-600 transition-colors whitespace-nowrap bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800"
                  title="Urutkan Lokasi"
                >
                  <div className="inline-flex items-center justify-center gap-1">
                    <span>Lokasi</span>
                    {renderSortArrows('lokasi')}
                  </div>
                </th>

                {/* Luas */}
                <th
                  onClick={() => handleSort('luas')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-emerald-600 transition-colors whitespace-nowrap bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800"
                  title="Urutkan Luas (Klik sel untuk edit)"
                >
                  <div className="inline-flex items-center justify-center gap-1">
                    <span>Luas (Ha)</span>
                    {renderSortArrows('luas')}
                  </div>
                </th>

                {/* Jenis Bibit */}
                <th
                  onClick={() => handleSort('jenisBibit')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-emerald-600 transition-colors whitespace-nowrap bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800"
                  title="Urutkan Jenis Bibit (Klik sel untuk edit)"
                >
                  <div className="inline-flex items-center justify-center gap-1">
                    <span>Jenis Bibit</span>
                    {renderSortArrows('jenisBibit')}
                  </div>
                </th>

                {/* Kelas Bibit */}
                <th
                  onClick={() => handleSort('kelasBibit')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-emerald-600 transition-colors whitespace-nowrap bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800"
                  title="Urutkan Kelas Bibit (Klik sel untuk edit)"
                >
                  <div className="inline-flex items-center justify-center gap-1">
                    <span>Kelas Bibit</span>
                    {renderSortArrows('kelasBibit')}
                  </div>
                </th>

                {/* Real Tanam */}
                <th
                  onClick={() => handleSort('realTanam')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-emerald-600 transition-colors whitespace-nowrap bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800"
                  title="Urutkan Real Tanam (Klik sel untuk edit)"
                >
                  <div className="inline-flex items-center justify-center gap-1">
                    <span>Real Tanam</span>
                    {renderSortArrows('realTanam')}
                  </div>
                </th>

                {/* Sisa */}
                <th
                  onClick={() => handleSort('sisa')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-emerald-600 transition-colors whitespace-nowrap bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800"
                  title="Urutkan Sisa (Rumus: Real Tanam - Luas)"
                >
                  <div className="inline-flex items-center justify-center gap-1">
                    <span>Sisa (Ha)</span>
                    {renderSortArrows('sisa')}
                  </div>
                </th>

                {/* Est. Selesai */}
                <th
                  onClick={() => handleSort('estSelesai')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-emerald-600 transition-colors whitespace-nowrap bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800"
                  title="Urutkan Est. Selesai (Arahkan kursor untuk date picker)"
                >
                  <div className="inline-flex items-center justify-center gap-1">
                    <span>Est. Selesai</span>
                    {renderSortArrows('estSelesai')}
                  </div>
                </th>

                {/* Progress */}
                <th
                  onClick={() => handleSort('progress')}
                  className="py-3 px-4 w-44 text-center cursor-pointer hover:text-emerald-600 transition-colors whitespace-nowrap bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800"
                  title="Urutkan Progress"
                >
                  <div className="inline-flex items-center justify-center gap-1">
                    <span>Progress</span>
                    {renderSortArrows('progress')}
                  </div>
                </th>

                {/* Awal Tanam */}
                <th
                  onClick={() => handleSort('awalTanam')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-emerald-600 transition-colors whitespace-nowrap bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800"
                  title="Urutkan Awal Tanam (Arahkan kursor untuk date picker)"
                >
                  <div className="inline-flex items-center justify-center gap-1">
                    <span>Awal Tanam</span>
                    {renderSortArrows('awalTanam')}
                  </div>
                </th>

                {/* Leadtime */}
                <th
                  onClick={() => handleSort('leadtime')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-emerald-600 transition-colors whitespace-nowrap bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800"
                  title="Urutkan Leadtime"
                >
                  <div className="inline-flex items-center justify-center gap-1">
                    <span>Leadtime</span>
                    {renderSortArrows('leadtime')}
                  </div>
                </th>

                {/* Status */}
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-emerald-600 transition-colors whitespace-nowrap bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800"
                  title="Urutkan Status"
                >
                  <div className="inline-flex items-center justify-center gap-1">
                    <span>Status</span>
                    {renderSortArrows('status')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="text-center">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Clock className="w-6 h-6 animate-spin text-emerald-500" />
                      <span>Memuat data Real Tanam Nanas...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        Tidak ada data lokasi yang sesuai
                      </span>
                      <span className="text-xs text-slate-400">
                        Coba sesuaikan kata kunci pencarian atau filter yang dipilih.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => {
                  const isDone = item.status === 'SELESAI';
                  const isProses = item.status === 'PROSES';
                  const rowNumber =
                    sortBy === 'id' && sortOrder === 'desc' && pagination.total > 0
                      ? pagination.total - ((page - 1) * limit + idx)
                      : (page - 1) * limit + idx + 1;
                  const isSavingThisRow = savingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group ${
                        isSavingThisRow ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      {/* NO */}
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px] whitespace-nowrap border-b border-slate-200/80 dark:border-slate-800">
                        {rowNumber}
                      </td>

                      {/* Lokasi */}
                      <td className="py-3 px-4 text-center whitespace-nowrap border-b border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setSelectedItem(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 font-bold font-mono tracking-wide hover:ring-2 hover:ring-emerald-500/30 transition-all"
                            title="Klik untuk melihat detail lengkap lokasi"
                          >
                            <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>{item.lokasi}</span>
                          </button>
                        </div>
                      </td>

                      {/* Luas (INLINE EDITABLE - RATA TENGAH) */}
                      <td
                        className={`py-2 px-3 text-center font-medium cursor-pointer transition-all whitespace-nowrap border-b border-slate-200/80 dark:border-slate-800 ${
                          savedSuccessCell?.id === item.id && savedSuccessCell?.field === 'luas'
                            ? 'bg-emerald-100/60 dark:bg-emerald-900/40'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/80'
                        }`}
                        onClick={() => startEdit(item, 'luas')}
                        title="Klik untuk mengedit Luas"
                      >
                        {editingCell?.id === item.id && editingCell?.field === 'luas' ? (
                          <input
                            ref={inputRef as any}
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveInlineEdit(item, 'luas', editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(item, 'luas', editValue);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-20 px-1.5 py-0.5 text-center text-xs font-bold rounded border border-emerald-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm mx-auto block"
                          />
                        ) : (
                          <div className="flex items-center justify-center gap-1 group-hover:text-emerald-600">
                            <span className="text-slate-800 dark:text-slate-200 font-semibold">
                              {item.luas?.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Jenis Bibit (INLINE EDITABLE DROPDOWN - RATA TENGAH) */}
                      <td
                        className={`py-2 px-3 text-center cursor-pointer transition-all whitespace-nowrap border-b border-slate-200/80 dark:border-slate-800 ${
                          savedSuccessCell?.id === item.id && savedSuccessCell?.field === 'jenisBibit'
                            ? 'bg-emerald-100/60 dark:bg-emerald-900/40'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/80'
                        }`}
                        onClick={() => startEdit(item, 'jenisBibit')}
                        title="Klik untuk memilih Jenis Bibit"
                      >
                        {editingCell?.id === item.id && editingCell?.field === 'jenisBibit' ? (
                          <select
                            ref={inputRef as any}
                            value={editValue}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditValue(val);
                              saveInlineEdit(item, 'jenisBibit', val);
                            }}
                            onBlur={() => saveInlineEdit(item, 'jenisBibit', editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="px-2 py-0.5 text-xs font-semibold rounded border border-emerald-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm mx-auto block"
                          >
                            <option value="">Pilih</option>
                            <option value="Crown">Crown</option>
                            <option value="Sucker">Sucker</option>
                          </select>
                        ) : (
                          <div className="flex justify-center">{getJenisBadge(item.jenisBibit)}</div>
                        )}
                      </td>

                      {/* Kelas Bibit (INLINE EDITABLE DROPDOWN - RATA TENGAH) */}
                      <td
                        className={`py-2 px-3 text-center cursor-pointer transition-all whitespace-nowrap border-b border-slate-200/80 dark:border-slate-800 ${
                          savedSuccessCell?.id === item.id && savedSuccessCell?.field === 'kelasBibit'
                            ? 'bg-emerald-100/60 dark:bg-emerald-900/40'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/80'
                        }`}
                        onClick={() => startEdit(item, 'kelasBibit')}
                        title="Klik untuk memilih Kelas Bibit"
                      >
                        {editingCell?.id === item.id && editingCell?.field === 'kelasBibit' ? (
                          <select
                            ref={inputRef as any}
                            value={editValue}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditValue(val);
                              saveInlineEdit(item, 'kelasBibit', val);
                            }}
                            onBlur={() => saveInlineEdit(item, 'kelasBibit', editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="px-2 py-0.5 text-xs font-semibold rounded border border-emerald-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm mx-auto block"
                          >
                            <option value="">Pilih</option>
                            <option value="Besar">Besar</option>
                            <option value="Sedang">Sedang</option>
                            <option value="Kecil">Kecil</option>
                            <option value="Extra Kecil">Extra Kecil</option>
                          </select>
                        ) : (
                          <div className="flex justify-center">{getKelasBadge(item.kelasBibit)}</div>
                        )}
                      </td>

                      {/* Real Tanam (INLINE EDITABLE - RATA TENGAH) */}
                      <td
                        className={`py-2 px-3 text-center cursor-pointer transition-all whitespace-nowrap border-b border-slate-200/80 dark:border-slate-800 ${
                          savedSuccessCell?.id === item.id && savedSuccessCell?.field === 'realTanam'
                            ? 'bg-emerald-100/60 dark:bg-emerald-900/40'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/80'
                        }`}
                        onClick={() => startEdit(item, 'realTanam')}
                        title="Klik untuk mengedit Real Tanam"
                      >
                        {editingCell?.id === item.id && editingCell?.field === 'realTanam' ? (
                          <input
                            ref={inputRef as any}
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveInlineEdit(item, 'realTanam', editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(item, 'realTanam', editValue);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-20 px-1.5 py-0.5 text-center text-xs font-bold rounded border border-emerald-500 bg-white dark:bg-slate-950 text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm mx-auto block"
                          />
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                              {item.realTanam !== null ? item.realTanam.toFixed(2) : '-'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Sisa (RUMUS OTOMATIS - RATA TENGAH) */}
                      <td className="py-3 px-4 text-center bg-slate-50/40 dark:bg-slate-950/20 whitespace-nowrap border-b border-slate-200/80 dark:border-slate-800">
                        {item.sisa !== null ? (
                          <span
                            className={`font-bold font-mono ${
                              item.sisa < 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : item.sisa === 0
                                ? 'text-slate-500 dark:text-slate-400'
                                : 'text-blue-600 dark:text-blue-400'
                            }`}
                          >
                            {item.sisa.toFixed(2)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Est. Selesai (Poin 3: DATE PICKER HOVER - RATA TENGAH) */}
                      <td
                        className={`py-2 px-3 text-center cursor-pointer transition-all whitespace-nowrap border-b border-slate-200/80 dark:border-slate-800 ${
                          savedSuccessCell?.id === item.id && savedSuccessCell?.field === 'estSelesai'
                            ? 'bg-emerald-100/60 dark:bg-emerald-900/40'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/80'
                        }`}
                        onMouseEnter={(e) => handleDateCellMouseEnter(e, item, 'estSelesai')}
                        onMouseLeave={handleDateCellMouseLeave}
                        title="Arahkan kursor untuk memilih tanggal"
                      >
                        <div className="flex items-center justify-center gap-1">
                          {item.estSelesai ? (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium text-slate-700 dark:text-slate-300">
                              <CalendarDays className="w-3 h-3 text-slate-400" />
                              {item.estSelesai}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">-</span>
                          )}
                        </div>
                      </td>

                      {/* Progress (RUMUS OTOMATIS - RATA TENGAH) */}
                      <td className="py-3 px-4 text-center bg-slate-50/40 dark:bg-slate-950/20 whitespace-nowrap border-b border-slate-200/80 dark:border-slate-800">
                        <div className="space-y-1 max-w-[120px] mx-auto">
                          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 font-mono text-center">
                            {item.progress !== null ? `${item.progress}%` : '0%'}
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                isDone
                                  ? 'bg-emerald-500'
                                  : isProses
                                  ? 'bg-amber-500'
                                  : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, item.progress || 0))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Awal Tanam (Poin 3: DATE PICKER HOVER - RATA TENGAH) */}
                      <td
                        className={`py-2 px-3 text-center cursor-pointer transition-all whitespace-nowrap border-b border-slate-200/80 dark:border-slate-800 ${
                          savedSuccessCell?.id === item.id && savedSuccessCell?.field === 'awalTanam'
                            ? 'bg-emerald-100/60 dark:bg-emerald-900/40'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/80'
                        }`}
                        onMouseEnter={(e) => handleDateCellMouseEnter(e, item, 'awalTanam')}
                        onMouseLeave={handleDateCellMouseLeave}
                        title="Arahkan kursor untuk memilih tanggal"
                      >
                        <div className="flex items-center justify-center gap-1">
                          {item.awalTanam ? (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium text-slate-700 dark:text-slate-300">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {item.awalTanam}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">-</span>
                          )}
                        </div>
                      </td>

                      {/* Leadtime (RUMUS OTOMATIS - RATA TENGAH) */}
                      <td className="py-3 px-4 text-center bg-slate-50/40 dark:bg-slate-950/20 whitespace-nowrap border-b border-slate-200/80 dark:border-slate-800">
                        {item.leadtime !== null ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                            <Clock className="w-3 h-3 text-indigo-500" />
                            {item.leadtime} hr
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>

                      {/* Status (RATA TENGAH) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap border-b border-slate-200/80 dark:border-slate-800">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Selesai
                          </span>
                        ) : isProses ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                            Proses
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            Belum
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* DATE PICKER FLOATING POPOVER (Poin 3: Muncul Melayang di Posisi Kursor/Sel) */}
          {hoverDatePicker && (
            <div
              style={{
                position: 'fixed',
                top: `${hoverDatePicker.y}px`,
                left: `${hoverDatePicker.x}px`,
                zIndex: 60,
              }}
              onMouseEnter={handlePickerMouseEnter}
              onMouseLeave={handlePickerMouseLeave}
              className="w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Popover Header */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <span>
                    {hoverDatePicker.field === 'awalTanam' ? 'Pilih Awal Tanam' : 'Pilih Est. Selesai'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHoverDatePicker(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Month/Year Navigation */}
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setPickerViewMonth(
                      new Date(pickerViewMonth.getFullYear(), pickerViewMonth.getMonth() - 1, 1)
                    );
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {MONTHS_EN[pickerViewMonth.getMonth()]} {pickerViewMonth.getFullYear()}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setPickerViewMonth(
                      new Date(pickerViewMonth.getFullYear(), pickerViewMonth.getMonth() + 1, 1)
                    );
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day Names Header */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400 mb-1">
                <span>Min</span>
                <span>Sen</span>
                <span>Sel</span>
                <span>Rab</span>
                <span>Kam</span>
                <span>Jum</span>
                <span>Sab</span>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-center mb-3">
                {renderCalendarDays()}
              </div>

              {/* Quick Action Footer */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const rowItem = data.find((r) => r.id === hoverDatePicker.id);
                    if (rowItem) {
                      saveInlineEdit(rowItem, hoverDatePicker.field, null);
                    }
                    setHoverDatePicker(null);
                  }}
                  className="text-red-500 hover:text-red-600 font-semibold text-[11px]"
                >
                  Kosongkan
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const rowItem = data.find((r) => r.id === hoverDatePicker.id);
                    if (rowItem) {
                      const todayFormatted = formatToRtnDate(new Date());
                      saveInlineEdit(rowItem, hoverDatePicker.field, todayFormatted);
                    }
                    setHoverDatePicker(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-100 text-[11px]"
                >
                  Hari Ini
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5. Pagination Bar */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/50 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Tampilkan</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>baris per halaman (Total: {pagination.total} data)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>
            <span className="px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-200">
              {page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Quick Detail Modal Pop-up (Bila user klik nama lokasi) */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">
                  Detail Real Tanam Nanas (RTN)
                </div>
                <h3 className="text-2xl font-black flex items-center gap-2 mt-1">
                  <MapPin className="w-6 h-6 text-emerald-300" />
                  Lokasi: {selectedItem.lokasi}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-400">Luas Target</div>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {selectedItem.luas.toFixed(2)} Ha
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-400">Realisasi Tanam</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedItem.realTanam !== null ? selectedItem.realTanam.toFixed(2) : '-'} Ha
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-400">Jenis Bibit</div>
                  <div className="mt-1 flex justify-center">{getJenisBadge(selectedItem.jenisBibit)}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-400">Kelas Bibit</div>
                  <div className="mt-1 flex justify-center">{getKelasBadge(selectedItem.kelasBibit)}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-400">Sisa Tanam (Rumus)</div>
                  <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {selectedItem.sisa !== null ? `${selectedItem.sisa.toFixed(2)} Ha` : '-'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-400">Leadtime (Rumus)</div>
                  <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedItem.leadtime !== null ? `${selectedItem.leadtime} Hari` : '-'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-400">Awal Tanam</div>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {selectedItem.awalTanam || '-'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-400">Estimasi Selesai</div>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {selectedItem.estSelesai || '-'}
                  </div>
                </div>
              </div>

              {/* Progress Detail */}
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  <span>Status &amp; Progress Penanaman</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                    {selectedItem.progress}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(100, selectedItem.progress || 0)}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
                  Status: <strong>{selectedItem.status}</strong>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
