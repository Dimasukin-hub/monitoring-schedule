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
  Wrench,
} from 'lucide-react';

const WILAYAH_LIST = ['AW01', 'AW02', 'AW03', 'AW04', 'AW05', 'AW06', 'AW07'];
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

export default function MasterDataPasangManualView() {
  const { canUploadMasterData } = useAuth();
  const [dataList, setDataList] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [selectedWilayah, setSelectedWilayah] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWilayahDropdownOpen, setIsWilayahDropdownOpen] = useState<boolean>(false);
  const [pasangMonthRange, setPasangMonthRange] = useState<{ startMonth: number; endMonth: number; year: number } | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState<boolean>(false);
  const [pickerYear, setPickerYear] = useState<number>(2026);

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
      if (!target.closest('.pasang-wilayah-dropdown')) {
        setIsWilayahDropdownOpen(false);
      }
      if (!target.closest('.pasang-monthpicker-container')) {
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
      if (pasangMonthRange) {
        params.set('year', String(pasangMonthRange.year));
        params.set('startMonth', String(pasangMonthRange.startMonth));
        params.set('endMonth', String(pasangMonthRange.endMonth));
      }

      const res = await fetch(`/api/gorong-gorong/master-pasang-manual?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setDataList(data.data.records || []);
        setTotalCount(data.data.total || 0);
        setTotalPages(data.data.totalPages || 1);
      }
    } catch (e) {
      console.error('Error fetching master data pasang manual:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(page, true);
  }, [page, pageSize, selectedWilayah, debouncedSearch, pasangMonthRange]);

  // Listener event update transaksi
  useEffect(() => {
    const handleUpdate = () => loadData(page, false);
    window.addEventListener('gorong_gorong_updated', handleUpdate);
    window.addEventListener('master_data_updated', handleUpdate);
    return () => {
      window.removeEventListener('gorong_gorong_updated', handleUpdate);
      window.removeEventListener('master_data_updated', handleUpdate);
    };
  }, [page]);

  const formatDate = (val: any) => {
    if (!val) return '-';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return '-';
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch {
      return '-';
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (selectedWilayah.length > 0) params.set('wilayah', selectedWilayah.join(','));
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (pasangMonthRange) {
        params.set('year', String(pasangMonthRange.year));
        params.set('startMonth', String(pasangMonthRange.startMonth));
        params.set('endMonth', String(pasangMonthRange.endMonth));
      }

      const res = await fetch(`/api/gorong-gorong/master-pasang-manual/export?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal mengunduh berkas Excel');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Master_Data_Pasang_Manual_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Gagal export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadResult({ success: false, message: 'Pilih file Excel terlebih dahulu' });
      return;
    }

    try {
      setIsUploading(true);
      setUploadResult(null);

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('mode', uploadMode);

      const res = await fetch('/api/gorong-gorong/master-pasang-manual/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (json.success) {
        setUploadResult({ success: true, message: json.message });
        setUploadFile(null);
        loadData(1, true);
        window.dispatchEvent(new CustomEvent('master_data_updated'));
      } else {
        setUploadResult({ success: false, message: json.message || 'Gagal mengunggah file' });
      }
    } catch (err: any) {
      setUploadResult({ success: false, message: err.message || 'Terjadi kesalahan sistem' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar: Title, Search, Filters & Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Wrench className="w-5 h-5" />
            </span>
            <span>Master Data Pasang Manual</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola dan tinjau data realisasi pasang manual gorong-gorong 4 diameter
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action: Refresh Data */}
          <button
            onClick={() => loadData(page, true)}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Action: Download Template */}
          <a
            href="/api/gorong-gorong/master-pasang-manual/template"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors shadow-2xs"
            download
          >
            <Download className="w-3.5 h-3.5" />
            <span>Template Excel</span>
          </a>

          {/* Action: Export Excel */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Mengunduh...' : 'Export Excel'}</span>
          </button>

          {/* Action: Upload Excel (Hanya jika punya hak upload) */}
          {canUploadMasterData && (
            <button
              onClick={() => {
                setUploadResult(null);
                setUploadFile(null);
                setIsUploadModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Baris Filter: Search, Wilayah & Month Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Lokasi */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Cari lokasi petak..."
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Multi-Select Wilayah Dropdown */}
          <div className="relative pasang-wilayah-dropdown">
            <button
              type="button"
              onClick={() => setIsWilayahDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                selectedWilayah.length > 0
                  ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-500 text-teal-700 dark:text-teal-300 font-bold'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <span>
                {selectedWilayah.length === 0
                  ? 'Semua Wilayah'
                  : `${selectedWilayah.length} Wilayah Dipilih`}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                  isWilayahDropdownOpen ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </button>

            {isWilayahDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWilayah([]);
                      setPage(1);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                      selectedWilayah.length === 0
                        ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Semua Wilayah</span>
                    {selectedWilayah.length === 0 && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    )}
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  {WILAYAH_LIST.map((w) => {
                    const isSelected = selectedWilayah.includes(w);
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedWilayah((prev) => prev.filter((item) => item !== w));
                          } else {
                            setSelectedWilayah((prev) => [...prev, w]);
                          }
                          setPage(1);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{w}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Month Range Picker untuk Tanggal Pasang Manual */}
          <div className="relative pasang-monthpicker-container">
            <button
              type="button"
              onClick={() => setIsMonthPickerOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                pasangMonthRange
                  ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-500 text-teal-700 dark:text-teal-300 font-bold'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {pasangMonthRange
                    ? `${MONTH_NAMES_SHORT[pasangMonthRange.startMonth]} – ${MONTH_NAMES_SHORT[pasangMonthRange.endMonth]} ${pasangMonthRange.year}`
                    : 'Rentang Bulan Pasang Manual'}
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

                {/* Grid 12 Bulan */}
                <div className="grid grid-cols-3 gap-1.5 my-2">
                  {MONTH_NAMES_SHORT.map((mName, mIdx) => {
                    const isSelectedYear = pasangMonthRange && pasangMonthRange.year === pickerYear;
                    const s = isSelectedYear ? Math.min(pasangMonthRange.startMonth, pasangMonthRange.endMonth) : -1;
                    const e = isSelectedYear ? Math.max(pasangMonthRange.startMonth, pasangMonthRange.endMonth) : -1;
                    const isStart = isSelectedYear && mIdx === s;
                    const isEnd = isSelectedYear && mIdx === e;
                    const inRange = isSelectedYear && mIdx >= s && mIdx <= e;

                    let btnClass = 'text-slate-300 hover:bg-slate-800/80 hover:text-white';
                    if (isStart || isEnd) {
                      btnClass = 'bg-teal-600 text-white font-black shadow-xs';
                    } else if (inRange) {
                      btnClass = 'bg-teal-600/30 text-teal-300 font-bold';
                    }

                    return (
                      <button
                        key={mName}
                        type="button"
                        onClick={() => {
                          if (!pasangMonthRange || (pasangMonthRange.startMonth !== pasangMonthRange.endMonth)) {
                            setPasangMonthRange({ startMonth: mIdx, endMonth: mIdx, year: pickerYear });
                          } else {
                            const first = pasangMonthRange.startMonth;
                            setPasangMonthRange({
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
                      setPasangMonthRange(null);
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
                    className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabel Data Master Pasang Manual */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-center border-collapse text-xs whitespace-nowrap">
            <thead className="sticky top-0 z-20 backdrop-blur-md bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-2xs">
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-3 text-center w-12 border-r border-slate-200/80 dark:border-slate-700/80">No</th>
                <th className="py-3 px-3 text-center font-bold text-teal-600 dark:text-teal-400 border-r border-slate-200/80 dark:border-slate-700/80">Lokasi</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80">Wilayah</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80">Tanggal Pasang Manual</th>
                <th className="py-3 px-3 text-center bg-teal-50/70 dark:bg-teal-950/30 border-r border-slate-200/80 dark:border-slate-700/80">Ø40</th>
                <th className="py-3 px-3 text-center bg-teal-50/70 dark:bg-teal-950/30 border-r border-slate-200/80 dark:border-slate-700/80">Ø60</th>
                <th className="py-3 px-3 text-center bg-teal-50/70 dark:bg-teal-950/30 border-r border-slate-200/80 dark:border-slate-700/80">Ø80</th>
                <th className="py-3 px-3 text-center bg-teal-50/70 dark:bg-teal-950/30">Ø100</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-500 mb-2" />
                    Memuat master data pasang manual...
                  </td>
                </tr>
              ) : dataList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada data pasang manual yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                dataList.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className="hover:bg-teal-50/20 dark:hover:bg-teal-950/10 transition-colors border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono border-r border-slate-200/70 dark:border-slate-800/70">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-teal-700 dark:text-teal-400 font-mono border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.lokasi}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.wilayah || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {formatDate(row.tanggalPasangManual)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold bg-teal-50/30 dark:bg-teal-950/10 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.diameter40 ?? 0}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold bg-teal-50/30 dark:bg-teal-950/10 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.diameter60 ?? 0}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold bg-teal-50/30 dark:bg-teal-950/10 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.diameter80 ?? 0}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold bg-teal-50/30 dark:bg-teal-950/10">
                      {row.diameter100 ?? 0}
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
            Halaman {page} dari {totalPages} (Total: {totalCount} data)
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
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Upload Excel Master Data Pasang Manual
                  </h3>
                  <p className="text-xs text-slate-500">
                    Format file: .xlsx / .xls sesuai template
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4">
              {/* Pilihan Mode Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mode Pengunggahan:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadMode('full_replace')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      uploadMode === 'full_replace'
                        ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 text-teal-950 dark:text-teal-200 font-bold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">Replace Total (Hapus Semua)</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Ganti seluruh data master pasang manual dengan isi file
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadMode('partial')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      uploadMode === 'partial'
                        ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 text-teal-950 dark:text-teal-200 font-bold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">Tambah / Sisipkan Data</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Tambahkan data baru tanpa menghapus data yang ada
                    </div>
                  </button>
                </div>
              </div>

              {/* Upload Input File */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pilih File Excel:
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setUploadFile(f);
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 dark:file:bg-teal-950/50 dark:file:text-teal-300 hover:file:bg-teal-100 cursor-pointer"
                />
              </div>

              {/* Notifikasi Hasil Upload */}
              {uploadResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                    uploadResult.success
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
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

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isUploading}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Proses Upload</span>
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
