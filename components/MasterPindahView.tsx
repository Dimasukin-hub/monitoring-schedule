'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  XCircle,
  RefreshCw,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRightLeft,
  Trash2,
} from 'lucide-react';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

const WILAYAH_LIST = ['AW01', 'AW02', 'AW03', 'AW04', 'AW05', 'AW06', 'AW07'];
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

export default function MasterPindahView() {
  const { canUploadMasterData, isAdmin } = useAuth();
  const [dataList, setDataList] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [selectedWilayah, setSelectedWilayah] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWilayahDropdownOpen, setIsWilayahDropdownOpen] = useState<boolean>(false);
  const [pindahMonthRange, setPindahMonthRange] = useState<{ startMonth: number; endMonth: number; year: number } | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState<boolean>(false);
  const [pickerYear, setPickerYear] = useState<number>(2026);

  // Delete State
  const [itemToDelete, setItemToDelete] = useState<{ id: number; label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/gorong-gorong/master-pindah?id=${itemToDelete.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setDataList((prev) => prev.filter((it) => it.id !== itemToDelete.id));
        setTotalCount((prev) => Math.max(0, prev - 1));
        setItemToDelete(null);
        window.dispatchEvent(new Event('gorong_gorong_updated'));
      } else {
        alert(json.message || 'Gagal menghapus data');
      }
    } catch (e: any) {
      alert(e.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export & Upload Modal States
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<'full_replace' | 'partial'>('full_replace');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.pindah-wilayah-dropdown')) {
        setIsWilayahDropdownOpen(false);
      }
      if (!target.closest('.pindah-monthpicker-container')) {
        setIsMonthPickerOpen(false);
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
      if (selectedWilayah.length > 0) params.set('wilayah', selectedWilayah.join(','));
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (pindahMonthRange) {
        params.set('year', String(pindahMonthRange.year));
        params.set('startMonth', String(pindahMonthRange.startMonth));
        params.set('endMonth', String(pindahMonthRange.endMonth));
      }

      const res = await fetch(`/api/gorong-gorong/master-pindah?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setDataList(data.data.records || []);
        setTotalCount(data.data.total || 0);
        setTotalPages(data.data.totalPages || 1);
      }
    } catch (e) {
      console.error('Error fetching master data pindah:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(page, dataList.length === 0);
  }, [page, selectedWilayah, debouncedSearch, pageSize, pindahMonthRange]);

  // Real-time synchronization: dengarkan transaksi form input & pembaruan master data
  useEffect(() => {
    const handleSync = () => {
      loadData(page, false);
    };
    window.addEventListener('gorong_gorong_updated', handleSync);
    window.addEventListener('master_data_updated', handleSync);
    return () => {
      window.removeEventListener('gorong_gorong_updated', handleSync);
      window.removeEventListener('master_data_updated', handleSync);
    };
  }, [page, selectedWilayah, debouncedSearch, pageSize, pindahMonthRange]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr || dateStr === '-') return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (selectedWilayah.length > 0) params.set('wilayah', selectedWilayah.join(','));
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (pindahMonthRange) {
        params.set('year', String(pindahMonthRange.year));
        params.set('startMonth', String(pindahMonthRange.startMonth));
        params.set('endMonth', String(pindahMonthRange.endMonth));
      }

      const res = await fetch(`/api/gorong-gorong/master-pindah/export?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal mengekspor berkas Excel');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Master_Data_Pindah_Lokasi_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Gagal mengekspor Excel: ' + (e.message || 'Terjadi kesalahan'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Pilih berkas Excel terlebih dahulu!');
      return;
    }
    try {
      setIsUploading(true);
      setUploadResult(null);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('mode', uploadMode);

      const res = await fetch('/api/gorong-gorong/master-pindah/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setUploadResult({ success: true, message: data.message });
        setUploadFile(null);
        await loadData(1, false);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gorong_gorong_updated'));
          window.dispatchEvent(new CustomEvent('master_data_updated', { detail: { type: 'pindah' } }));
        }
      } else {
        setUploadResult({ success: false, message: data.message || 'Gagal mengunggah berkas' });
      }
    } catch (e: any) {
      setUploadResult({ success: false, message: e.message || 'Terjadi kesalahan sistem' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Master Data Pindah Lokasi Gorong-Gorong
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {totalCount} Data
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pencatatan mutasi dan perpindahan gorong-gorong antar petak (Lokasi Pengirim &rarr; Lokasi Penerima).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download Template Excel */}
            {canUploadMasterData && (
              <a
                href="/api/gorong-gorong/master-pindah/template"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                title="Unduh template Excel kosong untuk master data pindah lokasi"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Template Excel
              </a>
            )}

            {/* Export Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Mengekspor...' : 'Export Excel'}
            </button>

            {/* Upload Excel Modal Trigger */}
            {canUploadMasterData && (
              <button
                type="button"
                onClick={() => {
                  setUploadResult(null);
                  setUploadFile(null);
                  setIsUploadModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Excel
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 relative z-30">
          {/* Search Box on the Left */}
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
              className="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
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

          {/* Filter Wilayah and Rentang Bulan on the Right */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative pindah-wilayah-dropdown">
              <button
                type="button"
                onClick={() => {
                  setIsWilayahDropdownOpen((prev) => !prev);
                  setIsMonthPickerOpen(false);
                }}
                className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer transition-colors shadow-2xs"
              >
                <span>
                  {selectedWilayah.length === 0
                    ? 'Semua Wilayah'
                    : selectedWilayah.length <= 3
                    ? selectedWilayah.join(', ')
                    : `${selectedWilayah.length} Wilayah`}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                    isWilayahDropdownOpen ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </button>

              {isWilayahDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-40 max-h-64 overflow-y-auto py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWilayah([]);
                      setPage(1);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                      selectedWilayah.length === 0 ? 'text-purple-600 font-bold bg-purple-50/50 dark:bg-purple-950/30' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>Semua Wilayah</span>
                    {selectedWilayah.length === 0 && <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />}
                  </button>
                  {WILAYAH_LIST.map((w) => {
                    const isSelected = selectedWilayah.includes(w);
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => {
                          setSelectedWilayah((prev) =>
                            prev.includes(w) ? prev.filter((item) => item !== w) : [...prev, w]
                          );
                          setPage(1);
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                          isSelected ? 'text-purple-600 font-bold bg-purple-50/50 dark:bg-purple-950/30' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{w}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Filter Rentang Bulan Pindah */}
            <div className="relative pindah-monthpicker-container">
              <button
                type="button"
                onClick={() => {
                  setIsMonthPickerOpen((prev) => !prev);
                  setIsWilayahDropdownOpen(false);
                }}
                className={`flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors shadow-2xs ${
                  pindahMonthRange
                    ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-600 text-purple-600 font-bold'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {pindahMonthRange
                      ? `${MONTH_NAMES_SHORT[pindahMonthRange.startMonth]} – ${MONTH_NAMES_SHORT[pindahMonthRange.endMonth]} ${pindahMonthRange.year}`
                      : 'Rentang Bulan Pindah'}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                    isMonthPickerOpen ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </button>

              {isMonthPickerOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 p-3.5 rounded-2xl bg-[#1e2330] text-white border border-slate-700/80 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* Header: Year Nav */}
                  <div className="flex items-center justify-between px-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setPickerYear((y) => y - 1)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-bold tracking-tight text-white">{pickerYear}</span>
                    <button
                      type="button"
                      onClick={() => setPickerYear((y) => y + 1)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Grid 12 Bulan (3 kolom x 4 baris) */}
                  <div className="grid grid-cols-3 gap-1.5 my-2">
                    {MONTH_NAMES_SHORT.map((mName, mIdx) => {
                      const isSelectedYear = pindahMonthRange && pindahMonthRange.year === pickerYear;
                      const s = isSelectedYear ? Math.min(pindahMonthRange.startMonth, pindahMonthRange.endMonth) : -1;
                      const e = isSelectedYear ? Math.max(pindahMonthRange.startMonth, pindahMonthRange.endMonth) : -1;
                      const isStart = isSelectedYear && mIdx === s;
                      const isEnd = isSelectedYear && mIdx === e;
                      const inRange = isSelectedYear && mIdx >= s && mIdx <= e;

                      let btnClass = 'text-slate-300 hover:bg-slate-800/80 hover:text-white';
                      if (isStart || isEnd) {
                        btnClass = 'bg-purple-600 text-white font-black shadow-xs';
                      } else if (inRange) {
                        btnClass = 'bg-purple-600/30 text-purple-300 font-bold';
                      }

                      return (
                        <button
                          key={mName}
                          type="button"
                          onClick={() => {
                            if (!pindahMonthRange || (pindahMonthRange.startMonth !== pindahMonthRange.endMonth)) {
                              setPindahMonthRange({ startMonth: mIdx, endMonth: mIdx, year: pickerYear });
                            } else {
                              const first = pindahMonthRange.startMonth;
                              setPindahMonthRange({
                                startMonth: Math.min(first, mIdx),
                                endMonth: Math.max(first, mIdx),
                                year: pickerYear,
                              });
                            }
                            setPage(1);
                          }}
                          className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${btnClass}`}
                        >
                          {mName}
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer Controls */}
                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setPindahMonthRange(null);
                        setIsMonthPickerOpen(false);
                        setPage(1);
                      }}
                      className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                    >
                      Reset Filter
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMonthPickerOpen(false);
                        setPage(1);
                      }}
                      className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer"
                    >
                      Terapkan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Panel dengan Freeze Panes & Border Antar Kolom */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-center border-collapse text-xs whitespace-nowrap">
            <thead className="sticky top-0 z-20 backdrop-blur-md bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-2xs">
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-3 text-center w-12 border-r border-slate-200/80 dark:border-slate-700/80">No</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80">Lokasi Pengirim</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80">Wilayah Pengirim</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80">Lokasi Penerima</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80">Wilayah Penerima</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80">Tanggal Pindah</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80">Ø40</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80">Ø60</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80">Ø80</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80">Ø100</th>
                <th className={`py-3 px-3 text-center ${isAdmin ? 'border-r border-slate-200/80 dark:border-slate-700/80' : ''}`}>Keterangan</th>
                {isAdmin && (
                  <th className="py-3 px-3 text-center">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 12 : 11} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
                    Memuat data master pindah lokasi...
                  </td>
                </tr>
              ) : dataList.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 12 : 11} className="py-12 text-center text-slate-400">
                    <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    Belum ada data perpindahan lokasi gorong-gorong.
                  </td>
                </tr>
              ) : (
                dataList.map((row, idx) => {
                  const no = (page - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={row.id || idx}
                      className="hover:bg-purple-50/20 dark:hover:bg-purple-950/10 transition-colors border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono border-r border-slate-200/70 dark:border-slate-800/70">
                        {no}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-rose-600 dark:text-rose-400 border-r border-slate-200/70 dark:border-slate-800/70">
                        {row.lokasiPengirim}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                        {row.wilayahPengirim || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400 border-r border-slate-200/70 dark:border-slate-800/70">
                        {row.lokasiPenerima}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                        {row.wilayahPenerima || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-300 font-mono border-r border-slate-200/70 dark:border-slate-800/70">
                        {formatDate(row.tanggal)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold border-r border-slate-200/70 dark:border-slate-800/70">
                        {row.diameter40 > 0 ? (
                          <span className="text-purple-600 dark:text-purple-400">{row.diameter40}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-normal">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold border-r border-slate-200/70 dark:border-slate-800/70">
                        {row.diameter60 > 0 ? (
                          <span className="text-purple-600 dark:text-purple-400">{row.diameter60}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-normal">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold border-r border-slate-200/70 dark:border-slate-800/70">
                        {row.diameter80 > 0 ? (
                          <span className="text-purple-600 dark:text-purple-400">{row.diameter80}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-normal">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold border-r border-slate-200/70 dark:border-slate-800/70">
                        {row.diameter100 > 0 ? (
                          <span className="text-purple-600 dark:text-purple-400">{row.diameter100}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-normal">0</span>
                        )}
                      </td>
                      <td className={`py-2.5 px-3 text-center text-slate-500 dark:text-slate-400 truncate max-w-xs ${isAdmin ? 'border-r border-slate-200/70 dark:border-slate-800/70' : ''}`}>
                        {row.keterangan || '-'}
                      </td>
                      {isAdmin && (
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() =>
                                setItemToDelete({ id: row.id, label: `${row.lokasiPengirim} -> ${row.lokasiPenerima}` })
                              }
                              title={`Hapus pindah lokasi ${row.lokasiPengirim} -> ${row.lokasiPenerima}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="py-3.5 px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 font-semibold">
          <div>
            Halaman {page} dari {totalPages || 1}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs font-semibold text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              type="button"
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

      {/* Modal Upload Excel */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Upload Master Data Pindah Lokasi
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Unggah berkas Excel (*.xlsx, *.xls) mutasi gorong-gorong
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4">
              {/* Opsi Mode Upload */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Mode Unggah:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      uploadMode === 'full_replace'
                        ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="uploadMode"
                      value="full_replace"
                      checked={uploadMode === 'full_replace'}
                      onChange={() => setUploadMode('full_replace')}
                      className="mt-0.5 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                        Replace All
                      </span>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight block">
                        Menghapus data lama dan menggantikannya dengan data Excel baru.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      uploadMode === 'partial'
                        ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="uploadMode"
                      value="partial"
                      checked={uploadMode === 'partial'}
                      onChange={() => setUploadMode('partial')}
                      className="mt-0.5 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                        Tambah Data
                      </span>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight block">
                        Menambahkan data baru tanpa menghapus data sebelumnya.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* File Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Berkas Excel:
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 dark:file:bg-purple-950 file:text-purple-700 dark:file:text-purple-300 hover:file:bg-purple-100 cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-2"
                />
              </div>

              {/* Upload Result Alert */}
              {uploadResult && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                    uploadResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {uploadResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{uploadResult.message}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Unggah Sekarang
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(itemToDelete)}
        itemLabel={itemToDelete?.label}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

