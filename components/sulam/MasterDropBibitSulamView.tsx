'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  Upload,
  Download,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  XCircle,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const WILAYAH_LIST = ['AW01', 'AW02', 'AW03', 'AW04', 'AW05', 'AW06', 'AW07'];
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

export default function MasterDropBibitSulamView() {
  const { canUploadMasterData } = useAuth();
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [search, setSearch] = useState('');
  const [selectedWilayah, setSelectedWilayah] = useState<string[]>([]);
  const [isWilayahOpen, setIsWilayahOpen] = useState(false);

  const [dropMonthRange, setDropMonthRange] = useState<{ startMonth: number; endMonth: number; year: number } | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState<boolean>(false);
  const [pickerYear, setPickerYear] = useState<number>(2026);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'full_replace' | 'partial'>('full_replace');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Click Outside Listener untuk menutup MonthPicker
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.drop-monthpicker-container')) {
        setIsMonthPickerOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent && dataList.length === 0) setLoading(true);
      const wilParam = selectedWilayah.length > 0 && selectedWilayah.length < WILAYAH_LIST.length
        ? selectedWilayah.join(',')
        : '';
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (search) params.set('search', search);
      if (wilParam) params.set('wilayah', wilParam);
      if (dropMonthRange) {
        params.set('year', String(dropMonthRange.year));
        params.set('startMonth', String(dropMonthRange.startMonth));
        params.set('endMonth', String(dropMonthRange.endMonth));
      }

      const res = await fetch(`/api/sulam/master-drop?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setDataList(json.data || []);
        if (json.pagination) setTotalCount(json.pagination.total);
      }
    } catch (err) {
      console.error('Error fetching master drop bibit sulam:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search, selectedWilayah, dropMonthRange]);

  // Real-time synchronization
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
  }, [page, search, selectedWilayah, dropMonthRange]);

  const handleToggleWilayah = (wil: string) => {
    if (selectedWilayah.includes(wil)) {
      setSelectedWilayah(selectedWilayah.filter((w) => w !== wil));
    } else {
      setSelectedWilayah([...selectedWilayah, wil]);
    }
    setPage(1);
  };

  const handleSelectAllWilayah = () => {
    if (selectedWilayah.length === WILAYAH_LIST.length || selectedWilayah.length === 0) {
      setSelectedWilayah([]);
    } else {
      setSelectedWilayah([...WILAYAH_LIST]);
    }
    setPage(1);
  };

  const getWilayahLabel = () => {
    if (selectedWilayah.length === 0 || selectedWilayah.length === WILAYAH_LIST.length) {
      return 'Semua Wilayah';
    }
    return `${selectedWilayah.length} Wilayah Dipilih`;
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      setIsUploading(true);
      setUploadMessage(null);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('mode', uploadMode);

      const res = await fetch('/api/sulam/master-drop', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setUploadMessage({ type: 'success', text: json.message });
        setUploadFile(null);
        fetchData(true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sulam_updated'));
          window.dispatchEvent(new CustomEvent('master_data_updated', { detail: { type: 'sulam_drop' } }));
        }
        setTimeout(() => {
          setIsUploadOpen(false);
          setUploadMessage(null);
        }, 1500);
      } else {
        setUploadMessage({ type: 'error', text: json.message || 'Gagal mengunggah data.' });
      }
    } catch (err) {
      setUploadMessage({ type: 'error', text: 'Terjadi kesalahan saat mengunggah.' });
    } finally {
      setIsUploading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>Master Data Drop Bibit Sulam</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {totalCount} Data
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Data master realisasi pengiriman (drop) bibit sulam dengan tampilan tanggal order
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {canUploadMasterData && (
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Excel</span>
            </button>
          )}

          <a
            href={(() => {
              const p = new URLSearchParams();
              if (search) p.set('search', search);
              if (selectedWilayah.length > 0 && selectedWilayah.length < WILAYAH_LIST.length) {
                p.set('wilayah', selectedWilayah.join(','));
              }
              if (dropMonthRange) {
                p.set('year', String(dropMonthRange.year));
                p.set('startMonth', String(dropMonthRange.startMonth));
                p.set('endMonth', String(dropMonthRange.endMonth));
              }
              return `/api/sulam/master-drop/export?${p.toString()}`;
            })()}
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </a>

          {canUploadMasterData && (
            <a
              href="/api/sulam/master-drop/template"
              download
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              title="Download Template Excel"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Template</span>
            </a>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3 relative z-30">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari Lokasi"
            className="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Filter Wilayah Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsWilayahOpen(!isWilayahOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{getWilayahLabel()}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isWilayahOpen ? 'rotate-180 text-emerald-600' : 'text-slate-400'}`} />
            </button>

            {isWilayahOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsWilayahOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={handleSelectAllWilayah}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Semua Wilayah</span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        selectedWilayah.length === 0 || selectedWilayah.length === WILAYAH_LIST.length
                          ? 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900/50'
                          : 'bg-slate-200 dark:bg-slate-600'
                      }`}
                    />
                  </button>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {WILAYAH_LIST.map((wil) => {
                      const isSelected = selectedWilayah.includes(wil);
                      return (
                        <button
                          key={wil}
                          type="button"
                          onClick={() => handleToggleWilayah(wil)}
                          className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
                        >
                          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{wil}</span>
                          <span
                            className={`w-2 h-2 rounded-full transition-all ${
                              isSelected
                                ? 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900/50 scale-110'
                                : 'bg-slate-200 dark:bg-slate-600'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Filter Rentang Bulan Drop Bibit */}
          <div className="relative drop-monthpicker-container">
            <button
              type="button"
              onClick={() => setIsMonthPickerOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                dropMonthRange
                  ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300 font-bold'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {dropMonthRange
                    ? `${MONTH_NAMES_SHORT[dropMonthRange.startMonth]} – ${MONTH_NAMES_SHORT[dropMonthRange.endMonth]} ${dropMonthRange.year}`
                    : 'Rentang Bulan Drop Bibit'}
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
                    const isSelectedYear = dropMonthRange && dropMonthRange.year === pickerYear;
                    const s = isSelectedYear ? Math.min(dropMonthRange.startMonth, dropMonthRange.endMonth) : -1;
                    const e = isSelectedYear ? Math.max(dropMonthRange.startMonth, dropMonthRange.endMonth) : -1;
                    const isStart = isSelectedYear && mIdx === s;
                    const isEnd = isSelectedYear && mIdx === e;
                    const inRange = isSelectedYear && mIdx >= s && mIdx <= e;

                    let btnClass = 'text-slate-300 hover:bg-slate-800/80 hover:text-white';
                    if (isStart || isEnd) {
                      btnClass = 'bg-amber-600 text-white font-black shadow-xs';
                    } else if (inRange) {
                      btnClass = 'bg-amber-600/30 text-amber-300 font-bold';
                    }

                    return (
                      <button
                        key={mName}
                        type="button"
                        onClick={() => {
                          if (!dropMonthRange || (dropMonthRange.startMonth !== dropMonthRange.endMonth)) {
                            setDropMonthRange({ startMonth: mIdx, endMonth: mIdx, year: pickerYear });
                          } else {
                            const first = dropMonthRange.startMonth;
                            setDropMonthRange({
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
                      setDropMonthRange(null);
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
                    className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="max-h-[600px] overflow-x-auto overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase font-bold tracking-wider shadow-xs">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[50px]">No</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[90px]">Lokasi</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[80px]">Hasil Ha</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[100px]">Hasil Btg</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[100px]">Tanggal</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[160px]">Bibit Ordered</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[80px]">Std Rit</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[90px]">Jumlah Rit</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[80px]">Jenis Unit</th>
                <th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[110px]">Tanggal Order</th>
                <th className="py-3 px-3 text-center min-w-[90px]">Status Drop</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                      <p className="text-xs font-semibold">Memuat master drop bibit sulam...</p>
                    </div>
                  </td>
                </tr>
              ) : dataList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <p className="text-xs font-semibold">Tidak ada data drop bibit yang cocok.</p>
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
                      {row.lokasi}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.hasilHa ?? '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-600 dark:text-amber-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.hasilBtg ? Number(row.hasilBtg).toLocaleString('id-ID') : 0}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.tanggal ? new Date(row.tanggal).toISOString().slice(0, 10) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700 dark:text-emerald-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.bibitOrdered || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.stdRit ?? '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.jumlahRit ?? '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.jenisUnit || 'CD'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.tanggalOrder ? new Date(row.tanggalOrder).toISOString().slice(0, 10) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-md font-extrabold text-xs ${
                        row.statusDrop === 'V'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                          : 'text-slate-400'
                      }`}>
                        {row.statusDrop || '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Clean Pagination Footer */}
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
                <span>Unggah Drop Bibit Sulam</span>
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

