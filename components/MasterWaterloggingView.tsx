'use client';

import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronDown, XCircle, Waves, RefreshCw } from 'lucide-react';

const WATERLOGGING_WILAYAH_LIST = Array.from({ length: 25 }, (_, i) => `AW${String(i + 1).padStart(2, '0')}`);

export default function MasterWaterloggingView() {
  const [dataList, setDataList] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [selectedWilayah, setSelectedWilayah] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Custom Dropdown Open State
  const [isWilayahDropdownOpen, setIsWilayahDropdownOpen] = useState<boolean>(false);

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
        setDataList(data.data.records || []);
        setTotalCount(data.data.total || 0);
        setTotalPages(data.data.totalPages || 1);
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
    </div>
  );
}

