'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  XCircle,
  Database,
  Download,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const MONTHS_LIST = [
  { val: '01', label: 'Januari' },
  { val: '02', label: 'Februari' },
  { val: '03', label: 'Maret' },
  { val: '04', label: 'April' },
  { val: '05', label: 'Mei' },
  { val: '06', label: 'Juni' },
  { val: '07', label: 'Juli' },
  { val: '08', label: 'Agustus' },
  { val: '09', label: 'September' },
  { val: '10', label: 'Oktober' },
  { val: '11', label: 'November' },
  { val: '12', label: 'Desember' },
];

let cachedSapList: any[] = [];
let cachedTotalCount = 0;
let cachedTotalPages = 1;

export default function MasterSapUploadView() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dataList, setDataList] = useState<any[]>(cachedSapList);
  const [totalCount, setTotalCount] = useState<number>(cachedTotalCount);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalPages, setTotalPages] = useState<number>(cachedTotalPages);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDiameter, setSelectedDiameter] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(cachedSapList.length === 0);

  // Custom Dropdown Open State
  const [isDiameterDropdownOpen, setIsDiameterDropdownOpen] = useState<boolean>(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState<boolean>(false);

  // Upload States
  const [uploadMode, setUploadMode] = useState<'full_replace' | 'partial'>('full_replace');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.diameter-dropdown-container')) {
        setIsDiameterDropdownOpen(false);
      }
      if (!target.closest('.month-dropdown-container')) {
        setIsMonthDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = async (targetPage = page, isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pageSize),
      });
      if (selectedDiameter.length > 0) params.set('diameter', selectedDiameter.join(','));
      if (selectedMonth.length > 0) params.set('bulan', selectedMonth.join(','));
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      const res = await fetch(`/api/gorong-gorong/sap-upload?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        cachedSapList = data.data.records || [];
        cachedTotalCount = data.data.total || 0;
        cachedTotalPages = data.data.totalPages || 1;
        setDataList(cachedSapList);
        setTotalCount(cachedTotalCount);
        setTotalPages(cachedTotalPages);
      }
    } catch (e) {
      console.error('Error fetching SAP records:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(page, dataList.length === 0);
  }, [page, selectedDiameter, selectedMonth, debouncedSearch]);

  const handleFileProcess = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setUploadError('File harus berupa dokumen Excel (.xlsx / .xls)');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', uploadMode);
      formData.append('uploadedBy', user?.name || user?.email || 'admin');

      const res = await fetch('/api/gorong-gorong/sap-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setUploadResult(data.data);
        setPage(1);
        loadData();
      } else {
        setUploadError(data.message || 'Gagal memproses file SAP.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Terjadi kesalahan saat mengunggah file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toISOString().slice(0, 10);
  };

  const formatCurrency = (val: number | null) => {
    if (val == null) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const formatTime = (val: number | string | null) => {
    if (val == null || val === '') return '-';
    if (typeof val === 'string' && val.includes(':')) return val.trim();
    const num = Number(val);
    if (isNaN(num)) return String(val);
    // Pecahan hari Excel ke detik
    const fraction = num % 1;
    const totalSeconds = Math.round((fraction >= 0 ? fraction : fraction + 1) * 86400);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Upload Zone & Header */}
      <div className="bg-gradient-to-r from-violet-600/10 via-purple-600/5 to-transparent border border-violet-500/20 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-500/15 text-violet-600 dark:text-violet-400 rounded-xl ring-1 ring-violet-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Upload Realisasi SAP Gorong-Gorong (Form 630)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-semibold border border-violet-300 dark:border-violet-800">
                  {totalCount.toLocaleString()} Transaksi SAP
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Unggah berkas Excel Form 630 untuk sinkronisasi otomatis data realisasi SAP.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={`/api/gorong-gorong/sap-upload/export?${new URLSearchParams({
                ...(selectedDiameter.length > 0 ? { diameter: selectedDiameter.join(',') } : {}),
                ...(selectedMonth.length > 0 ? { bulan: selectedMonth.join(',') } : {}),
                ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
              }).toString()}`}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="Unduh seluruh data transaksi realisasi SAP ke dalam berkas Excel (.xlsx)"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Download Data Realisasi SAP (.xlsx)</span>
            </a>

            <a
              href="/api/gorong-gorong/sap-upload/template"
              download="Template_Upload_Realisasi_SAP_Form630.xlsx"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs hover:border-violet-500 transition-all cursor-pointer"
              title="Unduh format template Excel resmi Form 630 SAP (19 Kolom Real Gorong2)"
            >
              <Download className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span>Download Template Excel</span>
            </a>
          </div>
        </div>

        {/* Pilihan Mode Sinkronisasi Upload */}
        <div className="mt-5 p-3.5 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-violet-200 dark:border-violet-900/60 shadow-2xs">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
            Metode Sinkronisasi Data SAP:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setUploadMode('full_replace')}
              className={`p-3 rounded-lg text-left border transition-all cursor-pointer flex items-start gap-2.5 ${
                uploadMode === 'full_replace'
                  ? 'border-violet-600 bg-violet-50/80 dark:bg-violet-950/40 text-violet-900 dark:text-violet-100 ring-1 ring-violet-500'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900'
              }`}
            >
              <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                uploadMode === 'full_replace' ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-400'
              }`}>
                {uploadMode === 'full_replace' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              <div>
                <p className="text-xs font-bold">Replace Semua Data (All) (Disarankan)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Menimpa & memperbarui seluruh data transaksi realisasi SAP sekaligus dari berkas Excel.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setUploadMode('partial')}
              className={`p-3 rounded-lg text-left border transition-all cursor-pointer flex items-start gap-2.5 ${
                uploadMode === 'partial'
                  ? 'border-violet-600 bg-violet-50/80 dark:bg-violet-950/40 text-violet-900 dark:text-violet-100 ring-1 ring-violet-500'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900'
              }`}
            >
              <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                uploadMode === 'partial' ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-400'
              }`}>
                {uploadMode === 'partial' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              <div>
                <p className="text-xs font-bold">Replace Parsial (Per Baris / Nomor)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Hanya memperbarui baris lokasi yang ada di file Excel tanpa menghapus atau mengubah baris lokasi lainnya.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Drag & Drop Card */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-violet-500 bg-violet-500/10 scale-[1.005]'
              : 'border-violet-300 dark:border-violet-800/60 hover:border-violet-500 hover:bg-violet-500/5 bg-white/50 dark:bg-slate-900/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileProcess(e.target.files[0]);
              }
            }}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              {isUploading ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {isUploading
                  ? 'Sedang memproses dan menyimpan data realisasi SAP ke database...'
                  : 'Klik atau seret file Excel Form 630 ke sini'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {uploadMode === 'full_replace'
                  ? 'Mode: Replace Semua Data (All) — seluruh data lama digantikan file ini'
                  : 'Mode: Replace Parsial (Per Baris / Nomor) — hanya baris lokasi dalam file yang diperbarui'}
              </p>
            </div>
          </div>
        </div>

        {/* Upload Success Alert */}
        {uploadResult && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-start gap-3 animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm">Berhasil Mengunggah Data SAP!</p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/70 dark:bg-emerald-800/80 text-emerald-900 dark:text-emerald-100">
                  {uploadResult.mode === 'partial' ? 'Replace Parsial (Per Baris)' : 'Replace Semua Data (All)'}
                </span>
              </div>
              <p>
                Total baris diproses: <span className="font-bold">{uploadResult.totalInserted || uploadResult.totalBaris} baris</span> dari file{' '}
                <span className="font-mono font-semibold">{uploadResult.fileName}</span>.
                {uploadResult.detectedMonths && uploadResult.detectedMonths.length > 0 && (
                  <span className="ml-1 text-slate-600 dark:text-slate-300">
                    (Periode bulan terdeteksi: <strong>{uploadResult.detectedMonths.join(', ')}</strong>)
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-3 pt-1 text-[11px]">
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 rounded font-semibold">
                  Ø40: {uploadResult.countD40 || uploadResult.qtyD40 || 0} pcs
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 rounded font-semibold">
                  Ø60: {uploadResult.countD60 || uploadResult.qtyD60 || 0} pcs
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 rounded font-semibold">
                  Ø80: {uploadResult.countD80 || uploadResult.qtyD80 || 0} pcs
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 rounded font-semibold">
                  Ø100: {uploadResult.countD100 || uploadResult.qtyD100 || 0} pcs
                </span>
                <span className="px-2 py-0.5 bg-emerald-200/60 dark:bg-emerald-900/80 rounded font-bold">
                  Total Biaya: {formatCurrency(uploadResult.totalBiayaSum || uploadResult.totalBiaya)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Upload Error Alert */}
        {uploadError && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-3 animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-xs font-semibold">{uploadError}</p>
          </div>
        )}

        {/* Filter Bar */}
        <div className="mt-5 pt-4 border-t border-violet-500/10 flex flex-wrap items-center justify-between gap-3 relative z-30">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Cari Lokasi"
              className="w-full pl-8 pr-8 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Bersihkan pencarian"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Custom Dropdown Filter Bulan */}
            <div className="relative month-dropdown-container">
              <button
                type="button"
                onClick={() => {
                  setIsMonthDropdownOpen((prev) => !prev);
                  setIsDiameterDropdownOpen(false);
                }}
                className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer transition-colors shadow-2xs"
              >
                <span>
                  {selectedMonth.length === 0
                    ? 'Bulan'
                    : selectedMonth.length <= 2
                    ? selectedMonth.map((m) => MONTHS_LIST.find((item) => item.val === m)?.label || m).join(', ')
                    : `${selectedMonth.length} Bulan`}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                    isMonthDropdownOpen ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </button>

              {isMonthDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto scrollbar-thin animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMonth([]);
                      setPage(1);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                      selectedMonth.length === 0 ? 'text-violet-600 font-bold bg-violet-50/50 dark:bg-violet-950/30' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>Semua Bulan</span>
                    {selectedMonth.length === 0 && <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />}
                  </button>
                  {MONTHS_LIST.map((m) => {
                    const isSelected = selectedMonth.includes(m.val);
                    return (
                      <button
                        key={m.val}
                        type="button"
                        onClick={() => {
                          setSelectedMonth((prev) =>
                            prev.includes(m.val) ? prev.filter((item) => item !== m.val) : [...prev, m.val]
                          );
                          setPage(1);
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                          isSelected ? 'text-violet-600 font-bold bg-violet-50/50 dark:bg-violet-950/30' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{m.label}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Custom Dropdown Filter Diameter */}
            <div className="relative diameter-dropdown-container">
              <button
                type="button"
                onClick={() => {
                  setIsDiameterDropdownOpen((prev) => !prev);
                  setIsMonthDropdownOpen(false);
                }}
                className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer transition-colors shadow-2xs"
              >
                <span>
                  {selectedDiameter.length === 0
                    ? 'Diameter'
                    : selectedDiameter.length <= 2
                    ? selectedDiameter.map((d) => `Ø${d} CM`).join(', ')
                    : `${selectedDiameter.length} Diameter`}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                    isDiameterDropdownOpen ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </button>

              {isDiameterDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-40 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDiameter([]);
                      setPage(1);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                      selectedDiameter.length === 0 ? 'text-violet-600 font-bold bg-violet-50/50 dark:bg-violet-950/30' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>Semua Diameter</span>
                    {selectedDiameter.length === 0 && <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />}
                  </button>
                  {[
                    { val: '40', label: 'Ø40 CM' },
                    { val: '60', label: 'Ø60 CM' },
                    { val: '80', label: 'Ø80 CM' },
                    { val: '100', label: 'Ø100 CM' },
                  ].map((d) => {
                    const isSelected = selectedDiameter.includes(d.val);
                    return (
                      <button
                        key={d.val}
                        type="button"
                        onClick={() => {
                          setSelectedDiameter((prev) =>
                            prev.includes(d.val) ? prev.filter((item) => item !== d.val) : [...prev, d.val]
                          );
                          setPage(1);
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                          isSelected ? 'text-violet-600 font-bold bg-violet-50/50 dark:bg-violet-950/30' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{d.label}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabel 18 Kolom Realisasi SAP Form 630 (Freeze Panes Header & Garis Pembatas Halus) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-center border-collapse text-xs whitespace-nowrap">
            <thead className="sticky top-0 z-20 backdrop-blur-md bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-2xs">
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-3 text-center w-12 border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">No</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">Wilayah</th>
                <th className="py-3 px-3 text-center font-bold text-violet-600 dark:text-violet-400 border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">Lokasi</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">Status tanaman</th>
                <th className="py-3 px-3 text-center font-mono border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">SPK ID</th>
                <th className="py-3 px-3 text-center font-mono border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">PAS Document</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">Tanggal Realisasi</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[200px] bg-slate-100 dark:bg-slate-800">Deskripsi</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[280px] bg-slate-100 dark:bg-slate-800">Deskripsi Bahan/Alat/Lainlain</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">Jenis Data</th>
                <th className="py-3 px-3 text-center font-mono border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">Kode Bahan/Alat/Lainlain</th>
                <th className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400 border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">Resource Bahan/Alat</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">Hasil Efektif</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">Total Realisasi Biaya</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">Penanggung Jawab</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">Time</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">Air</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">Jumlah Air</th>
                <th className="py-3 px-3 text-center bg-slate-100 dark:bg-slate-800">Referensi Lokasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={19} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-violet-500 mb-2" />
                    Memuat data realisasi SAP...
                  </td>
                </tr>
              ) : dataList.length === 0 ? (
                <tr>
                  <td colSpan={19} className="py-12 text-center text-slate-400">
                    Tidak ada data SAP yang sesuai dengan filter atau pencarian.
                  </td>
                </tr>
              ) : (
                dataList.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className="hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition-colors border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono border-r border-slate-200/70 dark:border-slate-800/70">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300 font-semibold border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.wilayahSap || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-violet-700 dark:text-violet-400 font-mono border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.plantCostCenter || row.lokasi}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.statusTanaman || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.spkId || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.pasDocument || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {formatDate(row.tanggalRealisasi)}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300 min-w-[200px] border-r border-slate-200/70 dark:border-slate-800/70" title={row.deskripsiKegiatan}>
                      {row.deskripsiKegiatan || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300 min-w-[280px] font-medium border-r border-slate-200/70 dark:border-slate-800/70" title={row.deskripsiBahan}>
                      {row.deskripsiBahan || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.jenisData || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.kodeBahan || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-600 dark:text-emerald-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.qty ?? 0}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.hasilEfektif != null ? Number(row.hasilEfektif).toFixed(1) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.totalBiaya != null ? formatCurrency(row.totalBiaya) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.penanggungJawab || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {formatTime(row.waktuPelaksanaan)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.air != null ? row.air : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.jumlahAir != null ? row.jumlahAir : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                      {row.referensiLokasi || row.lokasi || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="py-3.5 px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 font-semibold">
          <div>
            Halaman {page} dari {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs font-semibold text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs font-semibold text-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

