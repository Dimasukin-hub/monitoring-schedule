'use client';

import React, { useState, useEffect } from 'react';
import {
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
} from 'lucide-react';

const WILAYAH_LIST = ['AW01', 'AW02', 'AW03', 'AW04', 'AW05', 'AW06', 'AW07'];

export default function MasterPindahView() {
  const [dataList, setDataList] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [selectedWilayah, setSelectedWilayah] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWilayahDropdownOpen, setIsWilayahDropdownOpen] = useState<boolean>(false);

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
  }, [page, selectedWilayah, debouncedSearch, pageSize]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toISOString().slice(0, 10);
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (selectedWilayah.length > 0) params.set('wilayah', selectedWilayah.join(','));
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

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
            <a
              href="/api/gorong-gorong/master-pindah/template"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
              title="Unduh template Excel kosong untuk master data pindah lokasi"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Template Excel
            </a>

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
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari petak pengirim / penerima..."
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Wilayah Dropdown Multi-select */}
          <div className="relative pindah-wilayah-dropdown">
            <button
              type="button"
              onClick={() => setIsWilayahDropdownOpen(!isWilayahDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <span>
                Wilayah:{' '}
                {selectedWilayah.length === 0
                  ? 'Semua'
                  : selectedWilayah.length === 1
                  ? selectedWilayah[0]
                  : `${selectedWilayah.length} Wilayah`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isWilayahDropdownOpen && (
              <div className="absolute left-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2 z-20 space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedWilayah([])}
                  className={`w-full text-left px-2 py-1 text-xs rounded-sm font-medium ${
                    selectedWilayah.length === 0
                      ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  Semua Wilayah
                </button>
                {WILAYAH_LIST.map((w) => {
                  const checked = selectedWilayah.includes(w);
                  return (
                    <label
                      key={w}
                      className="flex items-center gap-2 px-2 py-1 text-xs rounded-sm hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-slate-700 dark:text-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            setSelectedWilayah(selectedWilayah.filter((item) => item !== w));
                          } else {
                            setSelectedWilayah([...selectedWilayah, w]);
                          }
                        }}
                        className="rounded-sm border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>{w}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadData(page, true)}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 uppercase font-semibold text-[10.5px]">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">No</th>
                <th className="py-2.5 px-3 text-center">Lokasi Pengirim</th>
                <th className="py-2.5 px-3 text-center">Wilayah Pengirim</th>
                <th className="py-2.5 px-3 text-center">Lokasi Penerima</th>
                <th className="py-2.5 px-3 text-center">Wilayah Penerima</th>
                <th className="py-2.5 px-3 text-center">Tanggal Pindah</th>
                <th className="py-2.5 px-3 text-right">Ø40</th>
                <th className="py-2.5 px-3 text-right">Ø60</th>
                <th className="py-2.5 px-3 text-right">Ø80</th>
                <th className="py-2.5 px-3 text-right">Ø100</th>
                <th className="py-2.5 px-3 text-left">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
                    Memuat data master pindah lokasi...
                  </td>
                </tr>
              ) : dataList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
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
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2 px-3 text-center text-slate-400">{no}</td>
                      <td className="py-2 px-3 text-center font-bold text-rose-600 dark:text-rose-400">
                        {row.lokasiPengirim}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-500">
                        {row.wilayahPengirim || '-'}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {row.lokasiPenerima}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-500">
                        {row.wilayahPenerima || '-'}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-300 font-mono">
                        {formatDate(row.tanggal)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {row.diameter40 > 0 ? (
                          <span className="text-purple-600 dark:text-purple-400 font-bold">{row.diameter40}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {row.diameter60 > 0 ? (
                          <span className="text-purple-600 dark:text-purple-400 font-bold">{row.diameter60}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {row.diameter80 > 0 ? (
                          <span className="text-purple-600 dark:text-purple-400 font-bold">{row.diameter80}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {row.diameter100 > 0 ? (
                          <span className="text-purple-600 dark:text-purple-400 font-bold">{row.diameter100}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-left text-slate-500 dark:text-slate-400 truncate max-w-xs">
                        {row.keterangan || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{dataList.length}</span> dari{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{totalCount}</span> baris
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs">Baris per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-1 px-2"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>

            <div className="flex items-center gap-1 ml-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="p-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2">
                Halaman {page} dari {totalPages || 1}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="p-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
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
    </div>
  );
}
