'use client';

import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronDown, XCircle, RefreshCw } from 'lucide-react';

const ALL_STATUS_LIST = [
  'BMBK', 'BMST', 'BMSM', 'JBBM', 'JBNY', 'JBSM', 'JGBK', 'KLBK', 'KLBM', 'KLSM',
  'KLST', 'KSBK', 'KSSM', 'NPBB', 'NSBB', 'NSBK', 'NSCL', 'NSFC', 'NSSC', 'NSST',
  'PSBK', 'PSFC', 'PSNY', 'PSST', 'PSY1', 'PSY2', 'PSY3', 'PYBK', 'PYFC', 'PYNY',
  'RTFC', 'SKBK', 'SKCL', 'SKFC', 'SKST', 'TPFC', 'ZLBK'
];

const WILAYAH_LIST = ['AW01', 'AW02', 'AW03', 'AW04', 'AW05', 'AW06', 'AW07'];

export default function MasterStatusLokasiView() {
  const [dataList, setDataList] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [selectedWilayah, setSelectedWilayah] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Custom Dropdown Open States
  const [isWilayahDropdownOpen, setIsWilayahDropdownOpen] = useState<boolean>(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState<boolean>(false);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.wilayah-dropdown-container')) {
        setIsWilayahDropdownOpen(false);
      }
      if (!target.closest('.status-dropdown-container')) {
        setIsStatusDropdownOpen(false);
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
      if (selectedStatus.length > 0) params.set('status', selectedStatus.join(','));
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      const res = await fetch(`/api/gorong-gorong/master-lokasi?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setDataList(data.data.records || []);
        setTotalCount(data.data.total || 0);
        setTotalPages(data.data.totalPages || 1);
      }
    } catch (e) {
      console.error('Error fetching master status lokasi:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(page, dataList.length === 0);
  }, [page, selectedWilayah, selectedStatus, debouncedSearch]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toISOString().slice(0, 10);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-xs backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00873D] shadow-[0_0_8px_#00873D]" />
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Master Data Status Lokasi PG1
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Tabel acuan induk petak lahan PG1 yang memadukan data rawat, luas, kelas & jenis bibit, serta jadwal forcing 2026 dan 2027.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold shadow-2xs">
            Total: {totalCount} Lokasi
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 relative z-30">
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
            className="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00873D]"
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

        <div className="flex items-center gap-2">
          {/* Custom Dropdown Filter Wilayah */}
          <div className="relative wilayah-dropdown-container">
            <button
              type="button"
              onClick={() => {
                setIsWilayahDropdownOpen((prev) => !prev);
                setIsStatusDropdownOpen(false);
              }}
              className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer transition-colors shadow-2xs"
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
              <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-36 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWilayah([]);
                    setPage(1);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                    selectedWilayah.length === 0 ? 'text-[#00873D] font-bold bg-emerald-50/50 dark:bg-emerald-950/30' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>Semua Wilayah</span>
                  {selectedWilayah.length === 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#00873D]" />}
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
                        isSelected ? 'text-[#00873D] font-bold bg-emerald-50/50 dark:bg-emerald-950/30' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{w}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#00873D]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom Dropdown Filter Status */}
          <div className="relative status-dropdown-container">
            <button
              type="button"
              onClick={() => {
                setIsStatusDropdownOpen((prev) => !prev);
                setIsWilayahDropdownOpen(false);
              }}
              className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer transition-colors shadow-2xs"
            >
              <span>
                {selectedStatus.length === 0
                  ? 'Status'
                  : selectedStatus.length <= 2
                  ? selectedStatus.join(', ')
                  : `${selectedStatus.length} Status`}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                  isStatusDropdownOpen ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 max-h-64 overflow-y-auto py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatus([]);
                    setPage(1);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                    selectedStatus.length === 0 ? 'text-[#00873D] font-bold bg-emerald-50/50 dark:bg-emerald-950/30' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>Semua Status</span>
                  {selectedStatus.length === 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#00873D]" />}
                </button>
                {ALL_STATUS_LIST.map((s) => {
                  const isSelected = selectedStatus.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSelectedStatus((prev) =>
                          prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
                        );
                        setPage(1);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                        isSelected ? 'text-[#00873D] font-bold bg-emerald-50/50 dark:bg-emerald-950/30' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{s}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#00873D]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabel Master Status Lokasi PG1 (Alignment Tengah & Garis Pembatas Halus) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[620px] scrollbar-thin">
          <table className="w-full text-center border-collapse text-xs whitespace-nowrap">
            <thead className="bg-slate-100/90 dark:bg-slate-800/90 sticky top-0 z-20 backdrop-blur-md text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2.5 text-center w-12 border-r border-slate-200/80 dark:border-slate-700/80">No</th>
                <th className="px-3 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Lokasi</th>
                <th className="px-2.5 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Struc Plant</th>
                <th className="px-2.5 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Status Lengkap</th>
                <th className="px-2.5 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Status</th>
                <th className="px-2.5 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Luas Bruto</th>
                <th className="px-2.5 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Luas Aktif</th>
                <th className="px-2.5 py-2.5 text-center font-bold text-[#00873D] border-r border-slate-200/80 dark:border-slate-700/80">Luas Netto</th>
                <th className="px-2.5 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Bibit</th>
                <th className="px-2 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Kelas</th>
                <th className="px-2 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Jenis</th>
                <th className="px-2.5 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Tgl Rawat</th>
                <th className="px-2 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Hari</th>
                <th className="px-2 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Bulan</th>
                <th className="px-2 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Umur Rawat</th>
                <th className="px-2 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Umur Bulan</th>
                <th className="px-2.5 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Forcing STD</th>
                <th className="px-2.5 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Forcing Prod 26</th>
                <th className="px-2.5 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400 border-r border-slate-200/80 dark:border-slate-700/80">Forcing 2027</th>
                <th className="px-2.5 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Ket 2027</th>
                <th className="px-2.5 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Fix Forcing</th>
                <th className="px-2.5 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Forcing Gabungan</th>
                <th className="px-2 py-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80">Umur F Std</th>
                <th className="px-2 py-2.5 text-center">Umur F Prod</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={24} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00873D]" />
                    <span>Memuat master status lokasi...</span>
                  </td>
                </tr>
              ) : dataList.length === 0 ? (
                <tr>
                  <td colSpan={24} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada data master yang cocok.
                  </td>
                </tr>
              ) : (
                dataList.map((item: any, idx: number) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-100 dark:border-slate-800 ${
                      idx % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-900/40' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-center font-mono text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3 py-2 font-bold text-[#00873D] border-r border-slate-200/70 dark:border-slate-800/70">
                      {item.lokasi}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-200/70 dark:border-slate-800/70">{item.strucPlant || '-'}</td>
                    <td className="px-2.5 py-2 border-r border-slate-200/70 dark:border-slate-800/70">{item.statusLengkap || '-'}</td>
                    <td className="px-2.5 py-2 font-bold border-r border-slate-200/70 dark:border-slate-800/70">{item.status || '-'}</td>
                    <td className="px-2.5 py-2 font-mono border-r border-slate-200/70 dark:border-slate-800/70">{item.luasBruto?.toFixed(2) || '-'}</td>
                    <td className="px-2.5 py-2 font-mono border-r border-slate-200/70 dark:border-slate-800/70">{item.luasAktif?.toFixed(2) || '-'}</td>
                    <td className="px-2.5 py-2 font-mono font-bold text-[#00873D] border-r border-slate-200/70 dark:border-slate-800/70">{item.luasNetto?.toFixed(2) || '-'}</td>
                    <td className="px-2.5 py-2 font-mono text-[11px] border-r border-slate-200/70 dark:border-slate-800/70">{item.bibit || '-'}</td>
                    <td className="px-2 py-2 font-bold border-r border-slate-200/70 dark:border-slate-800/70">{item.kelas || '-'}</td>
                    <td className="px-2 py-2 font-bold text-amber-600 border-r border-slate-200/70 dark:border-slate-800/70">{item.jenis || '-'}</td>
                    <td className="px-2.5 py-2 font-mono text-[11px] text-slate-500 border-r border-slate-200/70 dark:border-slate-800/70">{formatDate(item.tglRawat)}</td>
                    <td className="px-2 py-2 font-mono border-r border-slate-200/70 dark:border-slate-800/70">{item.hari ?? '-'}</td>
                    <td className="px-2 py-2 font-mono border-r border-slate-200/70 dark:border-slate-800/70">{item.bulan ?? '-'}</td>
                    <td className="px-2 py-2 font-mono border-r border-slate-200/70 dark:border-slate-800/70">{item.umurRawat ?? '-'}</td>
                    <td className="px-2 py-2 font-mono border-r border-slate-200/70 dark:border-slate-800/70">{item.umurBulan ?? '-'}</td>
                    <td className="px-2.5 py-2 font-mono text-[11px] border-r border-slate-200/70 dark:border-slate-800/70">{formatDate(item.forcingStd)}</td>
                    <td className="px-2.5 py-2 font-mono text-[11px] border-r border-slate-200/70 dark:border-slate-800/70">{formatDate(item.forcingProd2026)}</td>
                    <td className="px-2.5 py-2 font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 border-r border-slate-200/70 dark:border-slate-800/70">{formatDate(item.forcing2027)}</td>
                    <td className="px-2.5 py-2 border-r border-slate-200/70 dark:border-slate-800/70">
                      {item.ketForcing2027 ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.ketForcing2027 === 'real'
                            ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                        }`}>
                          {item.ketForcing2027}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-2.5 py-2 font-mono text-[11px] border-r border-slate-200/70 dark:border-slate-800/70">{formatDate(item.fixForcing)}</td>
                    <td className="px-2.5 py-2 font-mono text-[11px] border-r border-slate-200/70 dark:border-slate-800/70">{formatDate(item.forcingGabungan)}</td>
                    <td className="px-2 py-2 font-mono border-r border-slate-200/70 dark:border-slate-800/70">{item.umurFStd ?? '-'}</td>
                    <td className="px-2 py-2 font-mono">{item.umurFProd ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
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

