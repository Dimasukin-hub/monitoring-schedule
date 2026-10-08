'use client';

import React, { useState, useEffect, useRef } from 'react';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import { REAL_MASTER_STATUSES } from '@/components/LandTable';
import {
  Boxes,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  XCircle,
  Layers,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  Loader2,
} from 'lucide-react';

interface ListStokLahanViewProps {
  onSelectLand: (landId: number) => void;
  selectedWilayah?: string;
  initialCategory?: string;
  refreshTrigger?: number;
}

// Inline Editable Cell Component
interface EditableCellProps {
  landId: number;
  field: string;
  value: any;
  type?: 'text' | 'number';
  step?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  placeholder?: string;
  formatDisplay?: (val: any) => string;
  onSave: (landId: number, field: string, newValue: any, oldValue: any) => Promise<void>;
  isSaving?: boolean;
  isSaved?: boolean;
}

function EditableCell({
  landId,
  field,
  value,
  type = 'text',
  step,
  align = 'center',
  className = '',
  placeholder = '-',
  formatDisplay,
  onSave,
  isSaving = false,
  isSaved = false,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState<string>(value !== null && value !== undefined ? String(value) : '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal state when external value changes and not actively editing
  useEffect(() => {
    if (!isEditing) {
      setVal(value !== null && value !== undefined ? String(value) : '');
    }
  }, [value, isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
  };

  const handleCommit = async () => {
    setIsEditing(false);
    let trimmed = val.trim();
    let oldValStr = value !== null && value !== undefined ? String(value).trim() : '';

    if (type === 'number') {
      const parsedNew = trimmed === '' ? null : parseFloat(trimmed);
      const parsedOld = oldValStr === '' ? null : parseFloat(oldValStr);
      if (parsedNew === parsedOld) return;
      await onSave(landId, field, parsedNew, parsedOld);
    } else {
      if (trimmed === oldValStr) return;
      await onSave(landId, field, trimmed, oldValStr);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setVal(value !== null && value !== undefined ? String(value) : '');
      setIsEditing(false);
    }
  };

  const alignClass =
    align === 'right' ? 'text-right' : align === 'left' ? 'text-left' : 'text-center';

  return (
    <div
      onClick={handleStartEdit}
      className={`relative group/cell px-1.5 py-1 rounded-md transition-all cursor-text min-h-[28px] flex items-center ${
        align === 'right' ? 'justify-end' : align === 'left' ? 'justify-start' : 'justify-center'
      } ${
        isEditing
          ? 'bg-white dark:bg-slate-900 ring-2 ring-amber-500 shadow-xs'
          : 'hover:bg-amber-500/10 dark:hover:bg-amber-500/15 border border-transparent hover:border-amber-500/30'
      } ${className}`}
      title="Klik untuk langsung mengedit sel ini"
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type={type}
          step={step}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className={`w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 outline-none ${alignClass}`}
        />
      ) : (
        <div className={`flex items-center gap-1 w-full ${
          align === 'right' ? 'justify-end' : align === 'left' ? 'justify-start' : 'justify-center'
        }`}>
          <span
            className={`truncate text-xs ${alignClass} ${
              value === null || value === undefined || value === ''
                ? 'text-slate-400 dark:text-slate-500 italic'
                : 'text-slate-800 dark:text-slate-200'
            }`}
          >
            {formatDisplay
              ? formatDisplay(value)
              : value !== null && value !== undefined && value !== ''
              ? String(value)
              : placeholder}
          </span>
          {isSaving && (
            <Loader2 className="w-3 h-3 text-amber-500 animate-spin shrink-0 ml-1" />
          )}
          {isSaved && (
            <Check className="w-3 h-3 text-emerald-500 shrink-0 ml-1 animate-in zoom-in-50 duration-200" />
          )}
        </div>
      )}
    </div>
  );
}

export default function ListStokLahanView({
  onSelectLand,
  selectedWilayah = 'ALL',
  initialCategory = 'BK',
  refreshTrigger = 0,
}: ListStokLahanViewProps) {
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [selectedWilayahs, setSelectedWilayahs] = useState<string[]>(
    selectedWilayah && selectedWilayah !== 'ALL'
      ? selectedWilayah.split(',').map((w) => w.trim()).filter(Boolean)
      : []
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>(REAL_MASTER_STATUSES);
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(15);
  const [sortBy, setSortBy] = useState<string>('no');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [lands, setLands] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [categoryStats, setCategoryStats] = useState<Record<string, { count: number; totalNetto: number }>>({
    BK: { count: 0, totalNetto: 0 },
    BJK: { count: 0, totalNetto: 0 },
    SN: { count: 0, totalNetto: 0 },
    PROSES: { count: 0, totalNetto: 0 },
    SELESAI: { count: 0, totalNetto: 0 },
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [availableWilayahs, setAvailableWilayahs] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cell save states for visual feedback
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({});
  const [savedCells, setSavedCells] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/lands?limit=1')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.filters?.statuses?.length > 0) {
          setAvailableStatuses(res.filters.statuses);
        }
      })
      .catch(() => {});
  }, []);

  // 5 Category Cards (Warna selaras dengan identitas logo GGF)
  const categories = [
    {
      id: 'BK',
      label: 'BK',
      color: 'text-amber-600 dark:text-amber-400',
      activeBorder: 'border-amber-500 ring-1 ring-amber-500/40 bg-amber-50/80 dark:bg-slate-900',
      pillBg: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
    },
    {
      id: 'BJK',
      label: 'BJK',
      color: 'text-sky-600 dark:text-sky-400',
      activeBorder: 'border-sky-500 ring-1 ring-sky-500/40 bg-sky-50/80 dark:bg-slate-900',
      pillBg: 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30',
    },
    {
      id: 'SN',
      label: 'SN',
      color: 'text-lime-600 dark:text-lime-400',
      activeBorder: 'border-lime-500 ring-1 ring-lime-500/40 bg-lime-50/80 dark:bg-slate-900',
      pillBg: 'bg-lime-500/15 text-lime-900 dark:text-lime-300 border-lime-500/30',
    },
    {
      id: 'PROSES',
      label: 'Proses Tanam',
      color: 'text-cyan-600 dark:text-cyan-400',
      activeBorder: 'border-cyan-500 ring-1 ring-cyan-500/40 bg-cyan-50/80 dark:bg-slate-900',
      pillBg: 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/30',
    },
    {
      id: 'SELESAI',
      label: 'Selesai Tanam',
      color: 'text-emerald-700 dark:text-emerald-400',
      activeBorder: 'border-emerald-500 ring-1 ring-emerald-500/40 bg-emerald-50/80 dark:bg-slate-900',
      pillBg: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
    },
  ];

  const fetchStok = () => {
    setLoading(true);
    const params = new URLSearchParams({
      category: activeCategory,
      wilayah: selectedWilayahs.length > 0 ? selectedWilayahs.join(',') : 'ALL',
      status: selectedStatuses.length > 0 ? selectedStatuses.join(',') : 'ALL',
      search,
      page: String(page),
      limit: String(limit),
      sortBy,
      sortOrder,
    });

    fetch(`/api/stok?${params.toString()}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setLands(res.data);
          setPagination(res.pagination);
          if (res.categoryStats) {
            setCategoryStats(res.categoryStats);
          }
        }
      })
      .catch((err) => console.error('Error fetching stock:', err))
      .finally(() => setLoading(false));
  };

  const handleCellSave = async (
    landId: number,
    field: string,
    newValue: any,
    oldValue: any
  ) => {
    const cellKey = `${landId}-${field}`;
    setSavingCells((prev) => ({ ...prev, [cellKey]: true }));

    // Optimistically update local lands state
    setLands((prev) =>
      prev.map((item) => (item.id === landId ? { ...item, [field]: newValue } : item))
    );

    // If luasNetto updated, update categoryStats immediately
    if (field === 'luasNetto') {
      const oldNetto = Number(oldValue) || 0;
      const newNetto = Number(newValue) || 0;
      const diff = newNetto - oldNetto;
      setCategoryStats((prev) => ({
        ...prev,
        [activeCategory]: {
          ...prev[activeCategory],
          totalNetto: Math.max(0, (prev[activeCategory]?.totalNetto || 0) + diff),
        },
      }));
    }

    try {
      const payload: any = { [field]: newValue };
      const res = await fetch(`/api/stok/${landId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan perubahan');
      }

      setSavingCells((prev) => ({ ...prev, [cellKey]: false }));
      setSavedCells((prev) => ({ ...prev, [cellKey]: true }));
      setTimeout(() => {
        setSavedCells((prev) => {
          const next = { ...prev };
          delete next[cellKey];
          return next;
        });
      }, 2000);
    } catch (err: any) {
      console.error('Error saving cell:', err);
      alert(`Gagal menyimpan data: ${err.message}`);
      // Revert optimistic change
      setLands((prev) =>
        prev.map((item) => (item.id === landId ? { ...item, [field]: oldValue } : item))
      );
      if (field === 'luasNetto') {
        const oldNetto = Number(oldValue) || 0;
        const newNetto = Number(newValue) || 0;
        const diff = oldNetto - newNetto;
        setCategoryStats((prev) => ({
          ...prev,
          [activeCategory]: {
            ...prev[activeCategory],
            totalNetto: Math.max(0, (prev[activeCategory]?.totalNetto || 0) + diff),
          },
        }));
      }
      setSavingCells((prev) => ({ ...prev, [cellKey]: false }));
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setIsDownloading(true);
      const wilParam = selectedWilayahs.length > 0 ? selectedWilayahs.join(',') : 'ALL';
      const statParam = selectedStatuses.length > 0 ? selectedStatuses.join(',') : 'ALL';
      const url = `/api/stok/export?category=${encodeURIComponent(activeCategory)}&wilayah=${encodeURIComponent(wilParam)}&status=${encodeURIComponent(statParam)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Gagal mengunduh file Excel');
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Stok_Lahan_${activeCategory}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(`Download gagal: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadMessage(null);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/stok/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memproses file Excel');
      }

      setUploadMessage({
        type: 'success',
        text: data.message || 'File Excel berhasil diproses dan data tabel telah disinkronkan!',
      });

      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchStok();
    } catch (err: any) {
      setUploadMessage({
        type: 'error',
        text: err.message || 'Terjadi kesalahan saat mengunggah file',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (selectedWilayah) {
      const list =
        selectedWilayah !== 'ALL'
          ? selectedWilayah.split(',').map((w) => w.trim()).filter(Boolean)
          : [];
      setSelectedWilayahs(list);
      setPage(1);
    }
  }, [selectedWilayah]);

  useEffect(() => {
    fetchStok();
  }, [activeCategory, selectedWilayahs, selectedStatuses, search, page, limit, sortBy, sortOrder, refreshTrigger]);

  // Load distinct wilayah and status for filter
  useEffect(() => {
    fetch('/api/lands?limit=1')
      .then((r) => r.json())
      .then((d) => {
        if (d.filters?.wilayahs) setAvailableWilayahs(d.filters.wilayahs);
        if (d.filters?.statuses) setAvailableStatuses(d.filters.statuses);
      })
      .catch(() => {});
  }, []);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const renderSortArrows = (field: string) => {
    const isFieldActive = sortBy === field;
    return (
      <span className="inline-flex flex-col ml-1 shrink-0 select-none">
        <span
          role="button"
          tabIndex={0}
          title={field === 'no' ? 'Urutkan ke nomor paling awal (1...)' : 'Urutkan Naik'}
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
                ? 'text-emerald-800 dark:text-emerald-200 font-extrabold stroke-[3]'
                : 'text-emerald-600/40 dark:text-emerald-400/40 hover:text-emerald-800 dark:hover:text-emerald-200'
            }`}
          />
        </span>
        <span
          role="button"
          tabIndex={0}
          title={field === 'no' ? 'Urutkan ke nomor paling akhir (N...)' : 'Urutkan Turun'}
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
                ? 'text-emerald-800 dark:text-emerald-200 font-extrabold stroke-[3]'
                : 'text-emerald-600/40 dark:text-emerald-400/40 hover:text-emerald-800 dark:hover:text-emerald-200'
            }`}
          />
        </span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-white to-amber-500/10 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border border-emerald-500/25 dark:border-emerald-500/20 glass-panel flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Boxes className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              List Stok Lahan (GGF 2026)
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Daftar & Klasifikasi Posisi Stok Lahan 2026
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mt-1">
            Pantau posisi lahan berdasarkan klasifikasi mulai dari BK, BJK, SN, serta lokasi dalam Proses Tanam dan Selesai Tanam.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shrink-0 shadow-xs">
          <div className="text-right">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Kategori Terpilih</span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {pagination.total} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">Lokasi</span>
            </span>
          </div>
          <div className={`min-w-12 h-12 px-3.5 rounded-xl border flex items-center justify-center font-black text-xs sm:text-sm tracking-wide whitespace-nowrap shrink-0 shadow-xs ${
            categories.find(c => c.id === activeCategory)?.pillBg || 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
          }`}>
            {activeCategory}
          </div>
        </div>
      </div>

      {/* Category Tabs: BK, BJK, SN, Proses Tanam, Selesai Tanam (Warna GGF Logo) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          const stats = categoryStats[cat.id] || { count: 0, totalNetto: 0 };
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setPage(1);
              }}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                isActive
                  ? `${cat.activeBorder} shadow-md`
                  : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-base font-black tracking-tight ${cat.color}`}>
                  {cat.label}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {stats.count} Lokasi
                </span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {stats.totalNetto.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ha Netto
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Table Container with Grouped Header for PH (Bab 23 PRD) */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden glass-panel flex flex-col shadow-xs transition-colors">
        {/* Table Filter Controls */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Tabel Stok: <span className="text-amber-600 dark:text-amber-400">{activeCategory}</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({pagination.total} lokasi ditemukan)
              </span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
              {/* Search Input */}
              <div className="relative w-full sm:w-56 flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Cari lokasi"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer p-0.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60 flex items-center justify-center z-10"
                    title="Hapus pencarian"
                    aria-label="Hapus pencarian"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Download Excel Button */}
              <button
                onClick={handleDownloadExcel}
                disabled={isDownloading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                title="Download data tabel ke format Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span>{isDownloading ? 'Mengunduh...' : 'Download Excel'}</span>
              </button>

              {/* Upload Excel Button */}
              <label
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30 text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                  isUploading ? 'opacity-50 pointer-events-none' : ''
                }`}
                title="Upload file Excel untuk memperbarui data lahan"
              >
                <Upload className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                <span>{isUploading ? 'Memproses...' : 'Upload Excel'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleUploadExcel}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Filter Bar with MultiSelectDropdown exactly like Data Lahan */}
          <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 mr-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Filter:</span>
            </div>

            {/* Wilayah Filter */}
            <MultiSelectDropdown
              label="Wilayah"
              options={availableWilayahs}
              selected={selectedWilayahs}
              onChange={(val) => {
                setSelectedWilayahs(val);
                setPage(1);
              }}
            />

            {/* Status Filter */}
            <MultiSelectDropdown
              label="Status"
              options={availableStatuses.length > 0 ? availableStatuses : REAL_MASTER_STATUSES}
              selected={selectedStatuses}
              onChange={(val) => {
                setSelectedStatuses(val);
                setPage(1);
              }}
            />
          </div>

          {/* Active Filter Badges */}
          {(selectedWilayahs.length > 0 || selectedStatuses.length > 0) && (
            <div className="pt-2.5 mt-1 border-t border-dashed border-slate-200 dark:border-slate-800/80 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 leading-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>Data Difilter:</span>
                  <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                    ({selectedWilayahs.length + selectedStatuses.length} filter aktif)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedWilayahs([]);
                    setSelectedStatuses([]);
                    setPage(1);
                  }}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 underline underline-offset-2 cursor-pointer transition-colors leading-none inline-flex items-center"
                  title="Hapus semua filter"
                >
                  Reset
                </button>
              </div>

              <div className="flex items-center flex-wrap gap-1.5">
                {/* Wilayah badges */}
                {selectedWilayahs.map((w) => (
                  <span
                    key={`wil-${w}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 shadow-2xs transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
                  >
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Wilayah:</span>
                    <span className="font-semibold">{w}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWilayahs((prev) => prev.filter((item) => item !== w));
                        setPage(1);
                      }}
                      className="p-0.5 rounded-full hover:bg-rose-500 hover:text-white text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                      title={`Hapus filter Wilayah ${w}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}

                {/* Status badges */}
                {selectedStatuses.map((s) => (
                  <span
                    key={`stat-${s}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 shadow-2xs transition-all hover:bg-blue-100 dark:hover:bg-blue-900/60"
                  >
                    <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">Status:</span>
                    <span className="font-semibold">{s}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatuses((prev) => prev.filter((item) => item !== s));
                        setPage(1);
                      }}
                      className="p-0.5 rounded-full hover:bg-rose-500 hover:text-white text-blue-700 dark:text-blue-300 transition-colors cursor-pointer"
                      title={`Hapus filter Status ${s}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>


        {/* Upload Status Notification Banner */}
        {uploadMessage && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-200 ${
              uploadMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {uploadMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{uploadMessage.text}</span>
            </div>
            <button
              onClick={() => setUploadMessage(null)}
              className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Table Container with Freeze Panes (Sticky Header from NO to PH & Sticky Freeze Columns) */}
        <div className="overflow-auto scroll-smooth max-h-[calc(100vh-320px)] min-h-[440px] relative scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          <table className="min-w-full text-center text-xs border-separate border-spacing-0 table-fixed">
            <colgroup>
              <col className="w-[55px] min-w-[55px] max-w-[55px]" />
              <col className="w-[70px] min-w-[70px] max-w-[70px]" />
              <col className="w-[110px] min-w-[110px] max-w-[110px]" />
              <col className="w-[110px] min-w-[110px]" />
              <col className="w-[110px] min-w-[110px]" />
              <col className="w-[100px] min-w-[100px]" />
              <col className="w-[100px] min-w-[100px]" />
              <col className="w-[180px] min-w-[180px]" />
              <col className="w-[100px] min-w-[100px]" />
              <col className="w-[100px] min-w-[100px]" />
            </colgroup>
            <thead className="sticky top-0 z-20 bg-emerald-100 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-100 text-[11px] font-bold uppercase tracking-wider shadow-sm">
              <tr className="bg-emerald-100 dark:bg-emerald-950">
                {/* 1. NO (Sticky Freeze Column left-0) */}
                <th
                  rowSpan={2}
                  onClick={() => handleSort('no')}
                  className="sticky left-0 z-30 py-2.5 px-2 text-center align-middle font-bold border-r border-b border-emerald-300 dark:border-emerald-800/80 bg-emerald-200 dark:bg-emerald-900 w-[55px] min-w-[55px] max-w-[55px] cursor-pointer hover:bg-emerald-300/80 dark:hover:bg-emerald-800 transition-colors select-none"
                  title="Klik untuk sort nomor urut awal / akhir"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>NO</span>
                    {renderSortArrows('no')}
                  </div>
                </th>

                {/* 2. WIL (Sticky Freeze Column left-[55px]) */}
                <th
                  rowSpan={2}
                  onClick={() => handleSort('wilayah')}
                  className="sticky left-[55px] z-30 py-2.5 px-2 text-center align-middle font-bold border-r border-b border-emerald-300 dark:border-emerald-800/80 bg-emerald-100 dark:bg-emerald-950 w-[70px] min-w-[70px] max-w-[70px] cursor-pointer hover:bg-emerald-200/80 dark:hover:bg-emerald-900 transition-colors select-none"
                  title="Urutkan Wilayah"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>WIL</span>
                    {renderSortArrows('wilayah')}
                  </div>
                </th>

                {/* 3. LOKASI (Sticky Freeze Column left-[125px]) */}
                <th
                  rowSpan={2}
                  onClick={() => handleSort('lokasi')}
                  className="sticky left-[125px] z-30 py-2.5 px-3 text-center align-middle font-bold border-r border-b border-emerald-300 dark:border-emerald-800/80 bg-emerald-100 dark:bg-emerald-950 w-[110px] min-w-[110px] max-w-[110px] cursor-pointer hover:bg-emerald-200/80 dark:hover:bg-emerald-900 transition-colors select-none shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)] dark:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.35)]"
                  title="Urutkan Lokasi"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>LOKASI</span>
                    {renderSortArrows('lokasi')}
                  </div>
                </th>

                {/* 4. LUAS (HA) */}
                <th
                  colSpan={2}
                  className="py-1.5 px-3 text-center font-bold border-r border-b border-emerald-300/70 dark:border-emerald-800/70 bg-emerald-100 dark:bg-emerald-950 w-[220px] min-w-[220px]"
                >
                  LUAS (HA)
                </th>

                {/* 5. STS */}
                <th
                  rowSpan={2}
                  onClick={() => handleSort('status')}
                  className="py-2.5 px-2 text-center align-middle font-bold border-r border-b border-emerald-300/70 dark:border-emerald-800/70 w-[100px] min-w-[100px] cursor-pointer hover:bg-emerald-200/80 dark:hover:bg-emerald-900 transition-colors select-none bg-emerald-100 dark:bg-emerald-950"
                  title="Urutkan Status"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>STS</span>
                    {renderSortArrows('status')}
                  </div>
                </th>

                {/* 6. Eks */}
                <th
                  rowSpan={2}
                  onClick={() => handleSort('eks')}
                  className="py-2.5 px-2 text-center align-middle font-bold normal-case border-r border-b border-emerald-300/70 dark:border-emerald-800/70 w-[100px] min-w-[100px] cursor-pointer hover:bg-emerald-200/80 dark:hover:bg-emerald-900 transition-colors select-none bg-emerald-100 dark:bg-emerald-950"
                  title="Urutkan Eks"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>Eks</span>
                    {renderSortArrows('eks')}
                  </div>
                </th>

                {/* 7. Sejarah PS */}
                <th
                  rowSpan={2}
                  onClick={() => handleSort('sejarah')}
                  className="py-2.5 px-2 text-center align-middle font-bold normal-case border-r border-b border-emerald-300/70 dark:border-emerald-800/70 w-[180px] min-w-[180px] cursor-pointer hover:bg-emerald-200/80 dark:hover:bg-emerald-900 transition-colors select-none bg-emerald-100 dark:bg-emerald-950"
                  title="Urutkan Sejarah PS"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>Sejarah PS</span>
                    {renderSortArrows('sejarah')}
                  </div>
                </th>

                {/* 8. pH */}
                <th
                  colSpan={2}
                  className="py-1.5 px-3 text-center font-bold border-b border-emerald-300/70 dark:border-emerald-800/70 text-[13px] normal-case bg-emerald-100 dark:bg-emerald-950 w-[200px] min-w-[200px]"
                >
                  pH
                </th>
              </tr>

              {/* Sub-header row 2 */}
              <tr className="text-[10px] text-emerald-950 dark:text-emerald-100 font-bold bg-emerald-100 dark:bg-emerald-950">
                <th
                  onClick={() => handleSort('luasBruto')}
                  className="py-1.5 px-2.5 text-center border-r border-b border-emerald-300/70 dark:border-emerald-800/70 w-[110px] min-w-[110px] cursor-pointer hover:bg-emerald-200/80 dark:hover:bg-emerald-900 transition-colors select-none bg-emerald-100 dark:bg-emerald-950"
                  title="Urutkan Luas Bruto"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>BRUTO</span>
                    {renderSortArrows('luasBruto')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('luasNetto')}
                  className="py-1.5 px-2.5 text-center border-r border-b border-emerald-300/70 dark:border-emerald-800/70 w-[110px] min-w-[110px] cursor-pointer hover:bg-emerald-200/80 dark:hover:bg-emerald-900 transition-colors select-none bg-emerald-100 dark:bg-emerald-950"
                  title="Urutkan Luas Netto"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>NETTO</span>
                    {renderSortArrows('luasNetto')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('phBk')}
                  className="py-1.5 px-2.5 text-center font-bold border-r border-b border-emerald-300/70 dark:border-emerald-800/70 w-[100px] min-w-[100px] cursor-pointer hover:bg-emerald-200/80 dark:hover:bg-emerald-900 transition-colors select-none bg-emerald-100 dark:bg-emerald-950"
                  title="Urutkan pH BK"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>BK</span>
                    {renderSortArrows('phBk')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('phSn')}
                  className="py-1.5 px-2.5 text-center font-bold border-b border-emerald-300/70 dark:border-emerald-800/70 w-[100px] min-w-[100px] cursor-pointer hover:bg-emerald-200/80 dark:hover:bg-emerald-900 transition-colors select-none bg-emerald-100 dark:bg-emerald-950"
                  title="Urutkan pH SN"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>SN</span>
                    {renderSortArrows('phSn')}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Memuat data stok lahan...</span>
                    </div>
                  </td>
                </tr>
              ) : lands.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada lokasi lahan pada kategori ini.
                  </td>
                </tr>
              ) : (
                lands.map((land, idx) => {
                  const rowNumber =
                    sortBy === 'no' && sortOrder === 'desc' && pagination.total > 0
                      ? pagination.total - ((page - 1) * limit + idx)
                      : (page - 1) * limit + idx + 1;

                  return (
                    <tr
                      key={land.id}
                      className="hover:bg-cyan-50/40 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* 0. NO (Sticky Freeze Column left-0) */}
                      <td className="sticky left-0 z-10 py-2 px-2 text-center font-mono text-[11px] text-slate-500 dark:text-slate-400 border-r border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 group-hover:bg-cyan-50/80 dark:group-hover:bg-slate-800 transition-colors w-[55px] min-w-[55px] max-w-[55px] overflow-hidden">
                        {rowNumber}
                      </td>

                      {/* 1. WIL (Sticky Freeze Column left-[55px]) */}
                      <td className="sticky left-[55px] z-10 py-2 px-2 text-center border-r border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 group-hover:bg-cyan-50/80 dark:group-hover:bg-slate-800 transition-colors w-[70px] min-w-[70px] max-w-[70px] overflow-hidden">
                        <EditableCell
                          landId={land.id}
                          field="wilayah"
                          value={land.wilayah}
                          align="center"
                          onSave={handleCellSave}
                          isSaving={savingCells[`${land.id}-wilayah`]}
                          isSaved={savedCells[`${land.id}-wilayah`]}
                        />
                      </td>

                      {/* 2. LOKASI (Sticky Freeze Column left-[125px]) */}
                      <td
                        onClick={() => onSelectLand(land.id)}
                        className="sticky left-[125px] z-10 py-2 px-3 text-center font-bold text-amber-600 dark:text-amber-400 font-mono tracking-wide group-hover:underline border-r border-b border-slate-200 dark:border-slate-800/80 cursor-pointer select-none bg-white dark:bg-slate-900 group-hover:bg-cyan-50/80 dark:group-hover:bg-slate-800 transition-colors shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)] dark:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.35)] w-[110px] min-w-[110px] max-w-[110px] overflow-hidden"
                        title="Lokasi (Tetap) - Klik untuk melihat detail lengkap"
                      >
                        {land.lokasi}
                      </td>

                      {/* 3. LUAS BRUTO (Directly Editable) */}
                      <td className="py-2 px-2 text-center font-mono border-r border-b border-slate-200 dark:border-slate-800/80 w-[110px] min-w-[110px]">
                        <EditableCell
                          landId={land.id}
                          field="luasBruto"
                          value={land.luasBruto}
                          type="number"
                          step="0.01"
                          align="center"
                          formatDisplay={(val) => (val !== null && val !== undefined && val !== '' ? Number(val).toFixed(2) : '-')}
                          onSave={handleCellSave}
                          isSaving={savingCells[`${land.id}-luasBruto`]}
                          isSaved={savedCells[`${land.id}-luasBruto`]}
                        />
                      </td>

                      {/* 4. LUAS NETTO (Directly Editable) */}
                      <td className="py-2 px-2 text-center font-bold text-slate-900 dark:text-slate-100 font-mono border-r border-b border-slate-200 dark:border-slate-800/80 w-[110px] min-w-[110px]">
                        <EditableCell
                          landId={land.id}
                          field="luasNetto"
                          value={land.luasNetto}
                          type="number"
                          step="0.01"
                          align="center"
                          formatDisplay={(val) => (val !== null && val !== undefined && val !== '' ? Number(val).toFixed(2) : '-')}
                          onSave={handleCellSave}
                          isSaving={savingCells[`${land.id}-luasNetto`]}
                          isSaved={savedCells[`${land.id}-luasNetto`]}
                        />
                      </td>

                      {/* 5. STS (Directly Editable) */}
                      <td className="py-2 px-2 text-center border-r border-b border-slate-200 dark:border-slate-800/80 w-[100px] min-w-[100px]">
                        <EditableCell
                          landId={land.id}
                          field="status"
                          value={land.status}
                          align="center"
                          onSave={handleCellSave}
                          isSaving={savingCells[`${land.id}-status`]}
                          isSaved={savedCells[`${land.id}-status`]}
                        />
                      </td>

                      {/* 6. Eks (Directly Editable) */}
                      <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-800/80 w-[100px] min-w-[100px]">
                        <EditableCell
                          landId={land.id}
                          field="eks"
                          value={land.eks}
                          align="center"
                          onSave={handleCellSave}
                          isSaving={savingCells[`${land.id}-eks`]}
                          isSaved={savedCells[`${land.id}-eks`]}
                        />
                      </td>

                      {/* 7. Sejarah PS (Directly Editable) */}
                      <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300 font-mono text-[11px] border-r border-b border-slate-200 dark:border-slate-800/80 w-[180px] min-w-[180px]">
                        <EditableCell
                          landId={land.id}
                          field="sejarah"
                          value={land.sejarah}
                          align="center"
                          onSave={handleCellSave}
                          isSaving={savingCells[`${land.id}-sejarah`]}
                          isSaved={savedCells[`${land.id}-sejarah`]}
                        />
                      </td>

                      {/* 8. pH BK (Directly Editable) */}
                      <td className="py-2 px-2 text-center border-r border-b border-slate-200 dark:border-slate-800/80 font-semibold text-teal-600 dark:text-teal-400 font-mono w-[100px] min-w-[100px]">
                        <EditableCell
                          landId={land.id}
                          field="phBk"
                          value={land.phBk}
                          type="number"
                          step="0.01"
                          align="center"
                          formatDisplay={(val) => (val !== null && val !== undefined && val !== '' ? String(val) : '-')}
                          onSave={handleCellSave}
                          isSaving={savingCells[`${land.id}-phBk`]}
                          isSaved={savedCells[`${land.id}-phBk`]}
                        />
                      </td>

                      {/* 9. pH SN (Directly Editable) */}
                      <td className="py-2 px-2 text-center font-semibold text-emerald-600 dark:text-emerald-400 font-mono border-b border-slate-200 dark:border-slate-800/80 w-[100px] min-w-[100px]">
                        <EditableCell
                          landId={land.id}
                          field="phSn"
                          value={land.phSn}
                          type="number"
                          step="0.01"
                          align="center"
                          formatDisplay={(val) => (val !== null && val !== undefined && val !== '' ? String(val) : '-')}
                          onSave={handleCellSave}
                          isSaving={savingCells[`${land.id}-phSn`]}
                          isSaved={savedCells[`${land.id}-phSn`]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Tampilkan per halaman:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="15">15</option>
              <option value="30">30</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span className="ml-2">
              Halaman {page} dari {pagination.totalPages}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed shadow-xs"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
