'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Upload,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  XCircle,
  FileText,
} from 'lucide-react';

export default function MasterSpekBibitSulamView() {
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [search, setSearch] = useState('');

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'full_replace' | 'partial'>('full_replace');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent && dataList.length === 0) setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/sulam/master-spek?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setDataList(json.data || []);
        if (json.pagination) setTotalCount(json.pagination.total);
      }
    } catch (err) {
      console.error('Error fetching master spek bibit sulam:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search]);

  useEffect(() => {
    const handleSync = () => {
      fetchData(true);
    };
    window.addEventListener('sulam_updated', handleSync);
    window.addEventListener('master_data_updated', handleSync);
    return () => {
      window.removeEventListener('sulam_updated', handleSync);
      window.removeEventListener('master_data_updated', handleSync);
    };
  }, [page, search]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      setIsUploading(true);
      setUploadMessage(null);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('mode', uploadMode);

      const res = await fetch('/api/sulam/master-spek', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (json.success) {
        setUploadMessage({ type: 'success', text: json.message || 'Berhasil mengunggah data.' });
        setUploadFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchData();
        window.dispatchEvent(new Event('sulam_updated'));
        window.dispatchEvent(new Event('master_data_updated'));
        setTimeout(() => {
          setIsUploadOpen(false);
          setUploadMessage(null);
        }, 1500);
      } else {
        setUploadMessage({ type: 'error', text: json.message || 'Gagal mengunggah data.' });
      }
    } catch (err: any) {
      setUploadMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setIsUploading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-4">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-white/20 backdrop-blur-xs">
              <Layers className="w-4 h-4 text-white" />
            </span>
            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <span>Master Data Spek Bibit Sulam</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                {totalCount} Data
              </span>
            </h2>
          </div>
          <p className="text-xs text-white/80 max-w-xl">
            Referensi standar kapasitas per rit (CD dan Fuso) serta spesifikasi bibit sulam untuk kalkulasi otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/sulam/master-spek/template"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white backdrop-blur-xs transition-colors border border-white/20 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Unduh Template</span>
          </a>
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white text-emerald-800 hover:bg-emerald-50 transition-colors shadow-xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Excel</span>
          </button>
          <a
            href={`/api/sulam/master-spek/export${search ? `?search=${encodeURIComponent(search)}` : ''}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-800/60 hover:bg-emerald-800/80 text-white transition-colors border border-emerald-400/30 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor</span>
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Lokasi"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table (5 Kolom Berurutan) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="max-h-[600px] overflow-x-auto overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase font-bold tracking-wider shadow-xs">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[50px]">No</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[180px]">Spek BB Sulam Btg</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[100px]">CD</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[100px]">Fuso</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[200px]">Spesifikasi</th>
                <th className="py-3 px-3 text-center min-w-[180px]">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                      <p className="text-xs font-semibold">Memuat master spek bibit sulam...</p>
                    </div>
                  </td>
                </tr>
              ) : dataList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <p className="text-xs font-semibold">Tidak ada data spek bibit yang cocok.</p>
                  </td>
                </tr>
              ) : (
                dataList.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-500 border-r border-slate-200/70 dark:border-slate-800/70">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3 text-center font-black text-slate-900 dark:text-white border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.spekBBSulamBtg}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700 dark:text-emerald-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.cd ? Number(row.cd).toLocaleString('id-ID') : 0}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-blue-700 dark:text-blue-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.fuso ? Number(row.fuso).toLocaleString('id-ID') : 0}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.spesifikasi || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">
                      {row.keterangan || '-'}
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
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs font-semibold text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs font-semibold text-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Unggah Master Spek Bibit Sulam</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  uploadMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {uploadMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{uploadMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Metode Unggah</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadMode('full_replace')}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                      uploadMode === 'full_replace'
                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Replace All
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('partial')}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                      uploadMode === 'partial'
                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Tambah Data
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Pilih Berkas Excel (.xlsx, .xls)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
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

