'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  XCircle,
  Waves,
  RefreshCw,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

const WATERLOGGING_WILAYAH_LIST = Array.from({ length: 25 }, (_, i) => `AW${String(i + 1).padStart(2, '0')}`);

let cachedWaterloggingList: any[] = [];
let cachedTotalCount = 0;
let cachedTotalPages = 1;

export default function MasterWaterloggingView() {
  const [dataList, setDataList] = useState<any[]>(cachedWaterloggingList);
  const [totalCount, setTotalCount] = useState<number>(cachedTotalCount);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalPages, setTotalPages] = useState<number>(cachedTotalPages);

  const [selectedWilayah, setSelectedWilayah] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(cachedWaterloggingList.length === 0);

  // Custom Dropdown Open State
  const [isWilayahDropdownOpen, setIsWilayahDropdownOpen] = useState<boolean>(false);

  // Export & Upload Modal States
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<'full_replace' | 'partial'>('full_replace');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.waterlogging-wilayah-dropdown')) {
        setIsWilayahDropdownOpen(false);
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

      const res = await fetch(`/api/gorong-gorong/master-waterlogging?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        cachedWaterloggingList = data.data.records || [];
        cachedTotalCount = data.data.total || 0;
        cachedTotalPages = data.data.totalPages || 1;
        setDataList(cachedWaterloggingList);
        setTotalCount(cachedTotalCount);
        setTotalPages(cachedTotalPages);
      }
    } catch (e) {
      console.error('Error fetching master waterlogging:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(page, dataList.length === 0);
  }, [page, selectedWilayah, debouncedSearch]);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (selectedWilayah.length > 0) params.set('wilayah', selectedWilayah.join(','));
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      const res = await fetch(`/api/gorong-gorong/master-waterlogging/export?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal mengekspor berkas Excel');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Master_Waterlogging_PG1_${new Date().toISOString().slice(0, 10)}.xlsx`;
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

      const res = await fetch('/api/gorong-gorong/master-waterlogging/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setUploadResult({ success: true, message: data.message });
        setUploadFile(null);
        await loadData(1, true);
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-cyan-600/10 via-sky-600/5 to-transparent border border-cyan-500/20 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 rounded-xl ring-1 ring-cyan-500/30">
              <Waves className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Master Waterlogging
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-semibold border border-cyan-300 dark:border-cyan-800">
                  {totalCount.toLocaleString()} Lokasi
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pusat data digital genangan air (waterlogging).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="/api/gorong-gorong/master-waterlogging/template"
              download="Template_Master_Waterlogging.xlsx"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer transition-all shadow-xs"
              title="Unduh format template Excel kosong Master Waterlogging"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-600" />
              <span>Template Excel</span>
            </a>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer transition-all shadow-xs hover:border-cyan-500/50"
            >
              {isExporting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-cyan-600" />
              )}
              <span>{isExporting ? 'Mengekspor...' : 'Unduh Excel'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUploadResult(null);
                setUploadFile(null);
                setIsUploadModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Excel</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 pt-4 border-t border-cyan-500/10 flex flex-wrap items-center justify-between gap-3 relative z-30">
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
              className="w-full pl-8 pr-8 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
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

          <div className="flex items-center gap-3">
            {/* Custom Dropdown Filter Wilayah */}
            <div className="relative waterlogging-wilayah-dropdown">
              <button
                type="button"
                onClick={() => setIsWilayahDropdownOpen((prev) => !prev)}
                className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer transition-colors shadow-2xs"
              >
                <span>
                  {selectedWilayah.length === 0
                    ? 'Wilayah'
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
                      selectedWilayah.length === 0 ? 'text-cyan-600 font-bold bg-cyan-50/50 dark:bg-cyan-950/30' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>Semua Wilayah</span>
                    {selectedWilayah.length === 0 && <span className="w-1.5 h-1.5 rounded-full bg-cyan-600" />}
                  </button>
                  {WATERLOGGING_WILAYAH_LIST.map((w) => {
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
                          isSelected ? 'text-cyan-600 font-bold bg-cyan-50/50 dark:bg-cyan-950/30' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{w}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Data Master 14 Kolom (Freeze Panes Header & Garis Pembatas Halus) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-center border-collapse text-xs whitespace-nowrap">
            <thead className="sticky top-0 z-20 backdrop-blur-md bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-2xs">
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-3 text-center w-12 border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">No</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">PG</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">Wilayah</th>
                <th className="py-3 px-3 text-center font-bold text-cyan-600 dark:text-cyan-400 border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">Lokasi</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">Luas (Ha)</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800">Komoditas</th>
                <th className="py-3 px-3 text-center bg-cyan-100 dark:bg-cyan-950/70 border-r border-slate-200/80 dark:border-slate-700/80">Bulan DSM BK</th>
                <th className="py-3 px-3 text-center bg-cyan-100 dark:bg-cyan-950/70 border-r border-slate-200/80 dark:border-slate-700/80">Tahun DSM BK</th>
                <th className="py-3 px-3 text-center font-bold bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 border-r border-slate-200/80 dark:border-slate-700/80">DSM BK Plot</th>
                <th className="py-3 px-3 text-center bg-cyan-100 dark:bg-cyan-950/70 border-r border-slate-200/80 dark:border-slate-700/80">Dry BK</th>
                <th className="py-3 px-3 text-center bg-sky-100 dark:bg-sky-950/70 border-r border-slate-200/80 dark:border-slate-700/80">Bulan DSM ST</th>
                <th className="py-3 px-3 text-center bg-sky-100 dark:bg-sky-950/70 border-r border-slate-200/80 dark:border-slate-700/80">Tahun DSM ST</th>
                <th className="py-3 px-3 text-center font-bold bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-r border-slate-200/80 dark:border-slate-700/80">DSM ST Plot</th>
                <th className="py-3 px-3 text-center bg-sky-100 dark:bg-sky-950/70">Dry ST</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-500 mb-2" />
                    Memuat data master waterlogging...
                  </td>
                </tr>
              ) : dataList.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    Tidak ada data waterlogging yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                dataList.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className="hover:bg-cyan-50/30 dark:hover:bg-cyan-950/20 transition-colors border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono border-r border-slate-200/70 dark:border-slate-800/70">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.pg || 'PG1'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.wilayah || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-cyan-700 dark:text-cyan-400 font-mono border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.lokasi}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.luasHa != null ? Number(row.luasHa).toFixed(2) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.komoditas || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center bg-cyan-50/30 dark:bg-cyan-950/10 text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.bulanDsmBk || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center bg-cyan-50/30 dark:bg-cyan-950/10 font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.tahunDsmBk || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium bg-cyan-50/30 dark:bg-cyan-950/10 text-cyan-700 dark:text-cyan-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.dsmbkPlot ? (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 font-semibold text-[10px]">
                          {row.dsmbkPlot}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center bg-cyan-50/30 dark:bg-cyan-950/10 text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.dryBk || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center bg-sky-50/30 dark:bg-sky-950/10 text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.bulanDsmSt || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center bg-sky-50/30 dark:bg-sky-950/10 font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.tahunDsmSt || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium bg-sky-50/30 dark:bg-sky-950/10 text-sky-700 dark:text-sky-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.dsmPlot ? (
                        <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-semibold text-[10px]">
                          {row.dsmPlot}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center bg-sky-50/30 dark:bg-sky-950/10 text-slate-600 dark:text-slate-400">
                      {row.drySt || '-'}
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

      {/* Modal Upload Excel */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Upload Excel Master Waterlogging
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pilih mode upload dan unggah berkas .xlsx
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadResult(null);
                  setUploadFile(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-5">
              {/* Template Helper Box */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs">
                <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300">
                  <FileSpreadsheet className="w-4 h-4 shrink-0 text-cyan-600" />
                  <span className="text-[11px] font-medium">Belum memiliki format berkas? Gunakan template resmi kosong.</span>
                </div>
                <a
                  href="/api/gorong-gorong/master-waterlogging/template"
                  download="Template_Master_Waterlogging.xlsx"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[11px] shadow-xs cursor-pointer transition-colors shrink-0"
                >
                  <Download className="w-3 h-3" />
                  <span>Unduh Template</span>
                </a>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Metode Upload:
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      uploadMode === 'full_replace'
                        ? 'bg-red-500/5 border-red-500/40 text-slate-900 dark:text-slate-100'
                        : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="waterloggingUploadMode"
                      value="full_replace"
                      checked={uploadMode === 'full_replace'}
                      onChange={() => setUploadMode('full_replace')}
                      className="mt-0.5 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5 text-red-700 dark:text-red-400">
                        Replace All (Ganti Semua Data)
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Seluruh data Master Waterlogging di database akan diganti total dengan baris yang ada di berkas Excel ini.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      uploadMode === 'partial'
                        ? 'bg-cyan-500/5 border-cyan-500/40 text-slate-900 dark:text-slate-100'
                        : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="waterloggingUploadMode"
                      value="partial"
                      checked={uploadMode === 'partial'}
                      onChange={() => setUploadMode('partial')}
                      className="mt-0.5 text-cyan-600 focus:ring-cyan-500"
                    />
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400">
                        Replace Parsial (Update Sebagian)
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Hanya baris lokasi yang ada di berkas Excel yang diperbarui/ditambahkan. Data lokasi lainnya di database tetap utuh.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* File Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Berkas Excel (.xlsx / .xls):
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setUploadFile(f);
                  }}
                  className="block w-full text-xs text-slate-500 dark:text-slate-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-xl file:border-0
                    file:text-xs file:font-semibold
                    file:bg-cyan-500/10 file:text-cyan-700 dark:file:text-cyan-300
                    hover:file:bg-cyan-500/20 file:cursor-pointer
                    border border-slate-200 dark:border-slate-700 rounded-xl p-1 bg-slate-50/50 dark:bg-slate-800/50"
                />
                {uploadFile && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Terpilih: <b>{uploadFile.name}</b> ({(uploadFile.size / 1024).toFixed(1)} KB)</span>
                  </p>
                )}
              </div>

              {/* Result Notice */}
              {uploadResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                    uploadResult.success
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                      : 'bg-red-500/10 border border-red-500/30 text-red-800 dark:text-red-200'
                  }`}
                >
                  {uploadResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  )}
                  <div>{uploadResult.message}</div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setUploadResult(null);
                    setUploadFile(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Mulai Unggah</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

