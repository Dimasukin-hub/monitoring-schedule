'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Layers,
  Sprout,
  Activity,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Flame,
} from 'lucide-react';

export interface MasterLokasiDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lokasi: string | null;
  orderData?: any; // Data baris dari tabel List Lokasi Order jika tersedia
}

interface MasterStatusLokasiData {
  id: number;
  lokasi: string;
  strucPlant: string | null;
  statusLengkap: string | null;
  status: string | null;
  luasBruto: number | null;
  luasAktif: number | null;
  luasNetto: number | null;
  bibit: string | null;
  kelas: string | null;
  jenis: string | null;
  tglRawat: string | null;
  hari: number | null;
  bulan: number | null;
  umurRawat: number | null;
  umurBulan: number | null;
  forcingStd: string | null;
  forcingProd2026: string | null;
  forcing2027: string | null;
  ketForcing2027: string | null;
  fixForcing: string | null;
  forcingGabungan: string | null;
  umurFStd: number | null;
  umurFProd: number | null;
}

export default function MasterLokasiDetailDrawer({
  isOpen,
  onClose,
  lokasi,
  orderData,
}: MasterLokasiDetailDrawerProps) {
  const [masterData, setMasterData] = useState<MasterStatusLokasiData | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !lokasi) {
      setMasterData(null);
      setHistoryList([]);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/gorong-gorong/master-lokasi?lokasi=${encodeURIComponent(lokasi)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success && json.data) {
          setMasterData(json.data);
          setHistoryList(json.history || []);
        } else {
          setError(json.message || `Data master untuk lokasi ${lokasi} tidak ditemukan.`);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Gagal memuat master status lokasi.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, lokasi]);

  // Listener tombol Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Format Helper Tanggal DD/MM/YYYY
  const formatDate = (val: string | null | undefined) => {
    if (!val || val === '-') return '-';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return val;
    }
  };

  const strucPlant = masterData?.strucPlant || orderData?.wilayah || '-';
  const statusPetak = masterData?.status || orderData?.status || '-';
  const statusLengkap = masterData?.statusLengkap || '-';

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 dark:bg-black/75 backdrop-blur-[2px] transition-opacity cursor-pointer"
        title="Klik di luar untuk menutup"
      />

      {/* Drawer Panel */}
      <div className="relative z-10 w-full max-w-2xl sm:max-w-3xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight font-mono">
                  {lokasi}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  {strucPlant}
                </span>
                {statusPetak && statusPetak !== '-' && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                    {statusPetak}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Master Data Status Lokasi PG1 &bull; {statusLengkap}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 scrollbar-thin">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-9 h-9 border-3 border-[#00873D] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Memuat detail master status lokasi {lokasi}...
              </span>
            </div>
          ) : error ? (
            <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Informasi Master Tidak Ditemukan</h4>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* 1. STATUS PER LOKASI: Tanggal Rawat, Umur Bulan, Jenis Bibit, Kelas Bibit */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Sprout className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Status Per Lokasi
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-center flex flex-col items-center justify-center">
                    <span className="text-[10px] font-semibold text-slate-400 block text-center">Tanggal Rawat</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono mt-1 block text-center">
                      {formatDate(masterData?.tglRawat)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-center flex flex-col items-center justify-center">
                    <span className="text-[10px] font-semibold text-slate-400 block text-center">Umur Bulan</span>
                    <span className="text-xs font-bold text-[#00873D] dark:text-emerald-400 font-mono mt-1 block text-center">
                      {masterData?.umurBulan !== null && masterData?.umurBulan !== undefined
                        ? `${masterData.umurBulan} Bln`
                        : (orderData?.umurBulan ? `${orderData.umurBulan} Bln` : '-')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-center flex flex-col items-center justify-center">
                    <span className="text-[10px] font-semibold text-slate-400 block text-center">Jenis Bibit</span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1 block text-center">
                      {masterData?.jenis || '-'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-center flex flex-col items-center justify-center">
                    <span className="text-[10px] font-semibold text-slate-400 block text-center">Kelas Bibit</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block text-center">
                      {masterData?.kelas || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. STATUS GORONG GORONG */}
              {orderData && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#00873D]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Status Gorong Gorong
                      </h3>
                    </div>
                    {orderData.prioritas && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        orderData.prioritas === '1' || orderData.prioritas === 'P1'
                          ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
                          : orderData.prioritas === '2' || orderData.prioritas === 'P2'
                          ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                      }`}>
                        Prioritas: {orderData.prioritas}
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 mb-3 text-xs flex flex-wrap items-center justify-between gap-3 font-medium text-slate-600 dark:text-slate-400">
                    <div>
                      <span>Tgl Order: </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">{orderData.tanggalOrder || '-'}</strong>
                    </div>
                    <div>
                      <span>Aktivitas BK: </span>
                      <strong className="text-slate-800 dark:text-slate-200">{orderData.aktBk || '-'}</strong>
                    </div>
                    <div>
                      <span>DSM BK: </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">{orderData.dsmBk || '-'}</strong>
                    </div>
                    <div>
                      <span>DSM ST: </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">{orderData.dsmSt || '-'}</strong>
                    </div>
                  </div>

                  {/* Tabel Riwayat Transaksi Gorong-Gorong (Drop, Pasang Manual, & Pasang SAP) */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-2xs">
                    <table className="w-full text-center border-collapse text-xs whitespace-nowrap">
                      <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 w-10 text-center">
                            No
                          </th>
                          <th rowSpan={2} className="px-3.5 py-2 border-r border-slate-200 dark:border-slate-700 text-center">
                            Tanggal
                          </th>
                          <th rowSpan={2} className="px-3.5 py-2 border-r border-slate-200 dark:border-slate-700 text-center">
                            Jenis
                          </th>
                          <th colSpan={4} className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-700 text-center bg-slate-200/50 dark:bg-slate-700/50">
                            Diameter
                          </th>
                          <th rowSpan={2} className="px-4 py-2 text-center">
                            Penginput
                          </th>
                        </tr>
                        <tr className="border-t border-slate-200/70 dark:border-slate-700/70 text-[11px]">
                          <th className="px-2.5 py-1 border-r border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 font-mono">
                            Ø40
                          </th>
                          <th className="px-2.5 py-1 border-r border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 bg-blue-500/5 font-mono">
                            Ø60
                          </th>
                          <th className="px-2.5 py-1 border-r border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 bg-amber-500/5 font-mono">
                            Ø80
                          </th>
                          <th className="px-2.5 py-1 border-r border-slate-200 dark:border-slate-700 text-purple-600 dark:text-purple-400 bg-purple-500/5 font-mono">
                            Ø100
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-mono">
                        {historyList.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400 font-sans italic text-xs">
                              Belum ada riwayat transaksi Drop, Pasang Manual, atau Pasang SAP pada lokasi ini.
                            </td>
                          </tr>
                        ) : (
                          historyList.map((item, index) => {
                            const isDrop = item.jenisTransaksi === 'DROP';
                            const isSap = item.jenisTransaksi === 'PASANG_SAP';
                            return (
                              <tr key={item.id || index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-3 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center text-slate-400 font-sans text-[11px]">
                                  {index + 1}
                                </td>
                                <td className="px-3.5 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center text-slate-600 dark:text-slate-400 text-xs">
                                  {formatDate(item.tanggal)}
                                </td>
                                <td className="px-3.5 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center font-sans">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${
                                      isDrop
                                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                        : isSap
                                        ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800'
                                        : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                    }`}
                                  >
                                    {isDrop ? 'Drop' : isSap ? 'Pasang SAP' : 'Pasang Manual'}
                                  </span>
                                </td>
                                <td className="px-2.5 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                  {item.qtyD40 ?? 0}
                                </td>
                                <td className="px-2.5 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center font-bold text-blue-600 dark:text-blue-400">
                                  {item.qtyD60 ?? 0}
                                </td>
                                <td className="px-2.5 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center font-bold text-amber-600 dark:text-amber-400">
                                  {item.qtyD80 ?? 0}
                                </td>
                                <td className="px-2.5 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center font-bold text-purple-600 dark:text-purple-400">
                                  {item.qtyD100 ?? 0}
                                </td>
                                <td className="px-4 py-2 text-center font-sans text-xs text-slate-700 dark:text-slate-300">
                                  {item.penginput || 'User'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
