'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Plus,
} from 'lucide-react';
import TableDatePicker from '@/components/TableDatePicker';
import AddPlantingTransactionModal from '@/components/AddPlantingTransactionModal';

export interface PlantingDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lokasi: string | null;
  onTransactionSaved?: () => void;
}

interface TransactionItem {
  id: number;
  tanggal: string | null;
  lokasi: string;
  luasNetto: number | null;
  aktivitas: string | null;
  standar: number | null;
  besar: number | null;
  sedang: number | null;
  kecil: number | null;
  extraKecil: number | null;
  total: number;
  jenisBibit: string | null;
  wilayah: string | null;
  awalTanam: string | null;
  selesaiTanam: string | null;
  akumTanam: number | null;
  persenTanam: number | null;
  petikKe: string | null;
}

interface ApiResponse {
  success: boolean;
  lokasi: string;
  master: {
    id: number;
    lokasi: string;
    luas: number;
    jenisBibit: string | null;
    kelasBibit: string | null;
    realTanam: number | null;
    sisa: number | null;
    estSelesai: string | null;
    progress: number | null;
    awalTanam: string | null;
    leadtime: number | null;
    status: string | null;
  } | null;
  summary: {
    totalTanam: number;
    totalPetik: number;
    totalAll: number;
    countTanam: number;
    countPetik: number;
    countTotal: number;
    bibitBreakdown: Record<string, { total: number; standar: number; besar: number; sedang: number; kecil: number; extraKecil: number }>;
    firstDate: string | null;
    lastDate: string | null;
  };
  transactions: TransactionItem[];
}

export default function PlantingDetailDrawer({
  isOpen,
  onClose,
  lokasi,
  onTransactionSaved,
}: PlantingDetailDrawerProps) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'Tanam Bibit' | 'Petik Bibit'>('ALL');

  // Inline Editing State on the Table
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [savingCell, setSavingCell] = useState<{ id: number; field: string } | null>(null);
  const [savedSuccessCell, setSavedSuccessCell] = useState<{ id: number; field: string } | null>(null);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const fetchDetail = useCallback(async (loc: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/planting/detail?lokasi=${encodeURIComponent(loc)}&field=lokasi`
      );
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || 'Gagal memuat detail data');
      }
    } catch (err: any) {
      console.error('Error fetching detail drawer:', err);
      setError('Terjadi kesalahan saat memuat data detail.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && lokasi) {
      fetchDetail(lokasi);
      setEditingCell(null);
      setActiveTab('ALL');
    } else {
      setData(null);
      setEditingCell(null);
    }
  }, [isOpen, lokasi, fetchDetail]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (editingCell) {
          setEditingCell(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, editingCell]);

  if (!isOpen) return null;

  // Filter transactions based on active tab
  const displayedTransactions = data?.transactions
    ? activeTab === 'ALL'
      ? data.transactions
      : data.transactions.filter(
          (t) => (t.aktivitas || '').toLowerCase().includes(activeTab.toLowerCase().split(' ')[0])
        )
    : [];

  const master = data?.master;

  // Inline Editing Handlers
  const startEdit = (tx: TransactionItem, field: string) => {
    if (editingCell?.id === tx.id && editingCell?.field === field) {
      return;
    }
    setEditingCell({ id: tx.id, field });
    const rawVal = tx[field as keyof TransactionItem];
    setEditValue(rawVal ?? '');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveInlineEdit = async (tx: TransactionItem, field: string, val: any) => {
    setEditingCell(null);
    const existingVal = tx[field as keyof TransactionItem];
    if (existingVal == val) return;

    setSavingCell({ id: tx.id, field });
    try {
      const payload: any = { transactionId: tx.id };
      if (
        ['total', 'luasNetto', 'standar', 'besar', 'sedang', 'kecil', 'extraKecil', 'akumTanam', 'persenTanam'].includes(
          field
        )
      ) {
        payload[field] = val === '' || val === null || isNaN(Number(val)) ? 0 : Number(val);
      } else {
        payload[field] = val ? String(val).trim() : null;
      }

      const res = await fetch('/api/planting/detail', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (resJson.success) {
        setSavedSuccessCell({ id: tx.id, field });
        setTimeout(() => setSavedSuccessCell(null), 1500);

        if (lokasi) {
          await fetchDetail(lokasi);
        }
        if (onTransactionSaved) {
          onTransactionSaved();
        }
      } else {
        alert(resJson.error || 'Gagal menyimpan perubahan.');
      }
    } catch (err) {
      console.error('Error saving inline edit:', err);
      alert('Terjadi kesalahan saat menyimpan perubahan.');
    } finally {
      setSavingCell(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 dark:bg-black/75 backdrop-blur-[2px] transition-opacity"
      />

      {/* Drawer Container */}
      <div className="relative z-10 w-full max-w-6xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight font-mono">
                Detail Lokasi: {lokasi}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="py-28 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Memuat data transaksi...
              </span>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Gagal Mengambil Detail</h4>
                <p className="text-xs mt-1">{error}</p>
                <button
                  type="button"
                  onClick={() => lokasi && fetchDetail(lokasi)}
                  className="mt-3 px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 transition-colors shadow-xs"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 1. Ringkasan Master Lokasi */}
              {master && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Luas Target (RTN)
                    </span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-1 block">
                      {master.luas.toFixed(2)} Ha
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Real Tanam
                    </span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                      {master.realTanam !== null && master.realTanam !== undefined
                        ? `${master.realTanam.toFixed(2)} Ha`
                        : '-'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Sisa Lahan
                    </span>
                    <span
                      className={`text-base font-extrabold font-mono mt-1 block ${
                        (master.sisa ?? 0) < 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {master.sisa !== null && master.sisa !== undefined
                        ? `${master.sisa.toFixed(2)} Ha`
                        : '-'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Progress Tanam
                    </span>
                    <span className="text-base font-extrabold text-teal-600 dark:text-teal-400 font-mono mt-1 block">
                      {master.progress !== null && master.progress !== undefined
                        ? `${master.progress.toFixed(1)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Status Lokasi
                    </span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold mt-1 shadow-2xs ${
                        master.status === 'SELESAI'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : master.status === 'PROSES'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {master.status || 'BELUM TANAM'}
                    </span>
                  </div>
                </div>
              )}

              {/* 2. Section Tabel Transaksi (Inline Editable Langsung pada Sel) */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddTxModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      title={`Tambah Data baru untuk petak ${master?.lokasi || lokasi}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Data</span>
                    </button>
                  </div>

                  {/* Filter Tabs Aktivitas */}
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setActiveTab('ALL')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        activeTab === 'ALL'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Semua ({data?.summary?.countTotal || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('Tanam Bibit')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        activeTab === 'Tanam Bibit'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Tanam ({data?.summary?.countTanam || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('Petik Bibit')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        activeTab === 'Petik Bibit'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Petik ({data?.summary?.countPetik || 0})
                    </button>
                  </div>
                </div>

                {/* Table: Seluruh Kolom Tanggal s/d Petik Ke- (Tanpa Kolom Aksi) */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider z-10 border-b border-slate-200 dark:border-slate-800 shadow-xs">
                        {/* Header Baris 1: Kolom Utama & Pengelompokan Kelas Bibit & Tanggal */}
                        <tr>
                          <th rowSpan={2} className="py-2.5 px-2.5 text-center border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                            No
                          </th>
                          <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                            Tanggal
                          </th>
                          <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                            Lokasi
                          </th>
                          <th rowSpan={2} className="py-2.5 px-3 text-right border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                            Netto (Ha)
                          </th>
                          <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                            Aktivitas
                          </th>
                          <th colSpan={5} className="py-1 px-2 text-center border-r border-b border-slate-200 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-900">
                            Kelas Bibit
                          </th>
                          <th rowSpan={2} className="py-2.5 px-3 text-right font-black text-emerald-700 dark:text-emerald-300 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                            Total (Ha)
                          </th>
                          <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                            Jenis Bibit
                          </th>
                          <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                            Wilayah
                          </th>
                          <th colSpan={2} className="py-1 px-2 text-center border-r border-b border-slate-200 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-900">
                            Tanggal Tanam
                          </th>
                          <th rowSpan={2} className="py-2.5 px-3 text-right border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                            Akum Tanam
                          </th>
                          <th rowSpan={2} className="py-2.5 px-2.5 text-center border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                            % Tanam
                          </th>
                          <th rowSpan={2} className="py-2.5 px-2.5 text-center whitespace-nowrap">
                            Petik Ke-
                          </th>
                        </tr>

                        {/* Header Baris 2: Sub-Kolom Kelas Bibit dan Tanggal */}
                        <tr>
                          <th className="py-1.5 px-2 text-right border-r border-slate-200 dark:border-slate-800 font-semibold text-[9px] text-slate-500">
                            Standar
                          </th>
                          <th className="py-1.5 px-2 text-right border-r border-slate-200 dark:border-slate-800 font-semibold text-[9px] text-slate-500">
                            Besar
                          </th>
                          <th className="py-1.5 px-2 text-right border-r border-slate-200 dark:border-slate-800 font-semibold text-[9px] text-slate-500">
                            Sedang
                          </th>
                          <th className="py-1.5 px-2 text-right border-r border-slate-200 dark:border-slate-800 font-semibold text-[9px] text-slate-500">
                            Kecil
                          </th>
                          <th className="py-1.5 px-2 text-right border-r border-slate-200 dark:border-slate-800 font-semibold text-[9px] text-slate-500">
                            Extra Kecil
                          </th>
                          <th className="py-1.5 px-2.5 text-center border-r border-slate-200 dark:border-slate-800 font-semibold text-[9px] text-slate-500">
                            Awal Tanam
                          </th>
                          <th className="py-1.5 px-2.5 text-center border-r border-slate-200 dark:border-slate-800 font-semibold text-[9px] text-slate-500">
                            Selesai Tanam
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                        {displayedTransactions.length === 0 ? (
                          <tr>
                            <td
                              colSpan={17}
                              className="py-12 text-center text-slate-400 dark:text-slate-500 font-sans"
                            >
                              <div className="flex flex-col items-center justify-center gap-2">
                                <MapPin className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                                <span>Tidak ada data transaksi untuk lokasi {lokasi}.</span>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          displayedTransactions.map((tx, idx) => {
                            const isCellEditing = (f: string) =>
                              editingCell?.id === tx.id && editingCell?.field === f;
                            const isCellSuccess = (f: string) =>
                              savedSuccessCell?.id === tx.id && savedSuccessCell?.field === f;
                            const isCellSaving = (f: string) =>
                              savingCell?.id === tx.id && savingCell?.field === f;

                            const cellBaseClass = (f: string, extra = '') =>
                              `py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 transition-colors cursor-pointer select-none ${
                                isCellSuccess(f)
                                  ? 'bg-emerald-100/70 dark:bg-emerald-900/50 ring-1 ring-emerald-500'
                                  : isCellSaving(f)
                                  ? 'opacity-60 bg-amber-50 dark:bg-amber-950/30'
                                  : 'hover:bg-emerald-50/40 dark:hover:bg-slate-800/60'
                              } ${extra}`;

                            return (
                              <tr
                                key={tx.id || idx}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                              >
                                {/* 1. No */}
                                <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[10px] border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                                  {idx + 1}
                                </td>

                                {/* 2. Tanggal (Date Picker) */}
                                <td className={cellBaseClass('tanggal', 'whitespace-nowrap font-sans text-center')}>
                                  <div onClick={(e) => e.stopPropagation()} className="flex justify-center items-center">
                                    <TableDatePicker
                                      value={tx.tanggal}
                                      align="center"
                                      formatDisplay="full"
                                      onChange={(newDate) => saveInlineEdit(tx, 'tanggal', newDate)}
                                    />
                                  </div>
                                </td>

                                {/* 3. Lokasi (Read-only) */}
                                <td className="py-2 px-3 whitespace-nowrap font-bold text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800/60">
                                  {tx.lokasi}
                                </td>

                                {/* 4. Luas Netto (Inline Editable) */}
                                <td
                                  className={cellBaseClass('luasNetto', 'text-right whitespace-nowrap')}
                                  onClick={() => startEdit(tx, 'luasNetto')}
                                  title="Klik untuk mengedit Luas Netto"
                                >
                                  {isCellEditing('luasNetto') ? (
                                    <input
                                      ref={inputRef as any}
                                      type="number"
                                      step="0.01"
                                      value={editValue}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={(e) => saveInlineEdit(tx, 'luasNetto', e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveInlineEdit(tx, 'luasNetto', (e.target as HTMLInputElement).value);
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="w-20 px-1 py-0.5 text-right text-xs font-semibold rounded border border-emerald-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                                    />
                                  ) : (
                                    <span className="text-slate-600 dark:text-slate-400">
                                      {tx.luasNetto !== null ? tx.luasNetto.toFixed(2) : '-'}
                                    </span>
                                  )}
                                </td>

                                {/* 5. Aktivitas (Inline Editable Dropdown) */}
                                <td
                                  className={cellBaseClass('aktivitas', 'whitespace-nowrap')}
                                  onClick={() => startEdit(tx, 'aktivitas')}
                                  title="Klik untuk mengubah Aktivitas"
                                >
                                  {isCellEditing('aktivitas') ? (
                                    <select
                                      ref={inputRef as any}
                                      value={editValue}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEditValue(val);
                                        saveInlineEdit(tx, 'aktivitas', val);
                                      }}
                                      onBlur={(e) => saveInlineEdit(tx, 'aktivitas', e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="px-1.5 py-0.5 text-xs font-semibold rounded border border-emerald-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                                    >
                                      <option value="Tanam Bibit">Tanam Bibit</option>
                                      <option value="Petik Bibit">Petik Bibit</option>
                                    </select>
                                  ) : (
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-tight inline-block font-sans ${
                                        (tx.aktivitas || '').toLowerCase().includes('tanam')
                                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                      }`}
                                    >
                                      {tx.aktivitas || '-'}
                                    </span>
                                  )}
                                </td>

                                {/* 6. Standar (Inline Editable) */}
                                <td
                                  className={cellBaseClass('standar', 'text-right whitespace-nowrap')}
                                  onClick={() => startEdit(tx, 'standar')}
                                  title="Klik untuk mengedit Standar"
                                >
                                  {isCellEditing('standar') ? (
                                    <input
                                      ref={inputRef as any}
                                      type="number"
                                      step="0.01"
                                      value={editValue}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={(e) => saveInlineEdit(tx, 'standar', e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveInlineEdit(tx, 'standar', (e.target as HTMLInputElement).value);
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="w-20 px-1 py-0.5 text-right text-xs font-semibold rounded border border-emerald-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                                    />
                                  ) : (
                                    <span className="text-slate-500">
                                      {tx.standar && tx.standar > 0 ? tx.standar.toFixed(2) : '-'}
                                    </span>
                                  )}
                                </td>

                                {/* 7. Besar (Inline Editable) */}
                                <td
                                  className={cellBaseClass('besar', 'text-right whitespace-nowrap')}
                                  onClick={() => startEdit(tx, 'besar')}
                                  title="Klik untuk mengedit Besar"
                                >
                                  {isCellEditing('besar') ? (
                                    <input
                                      ref={inputRef as any}
                                      type="number"
                                      step="0.01"
                                      value={editValue}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={(e) => saveInlineEdit(tx, 'besar', e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveInlineEdit(tx, 'besar', (e.target as HTMLInputElement).value);
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="w-20 px-1 py-0.5 text-right text-xs font-semibold rounded border border-emerald-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                                    />
                                  ) : (
                                    <span className="text-slate-500">
                                      {tx.besar && tx.besar > 0 ? tx.besar.toFixed(2) : '-'}
                                    </span>
                                  )}
                                </td>

                                {/* 8. Sedang (Inline Editable) */}
                                <td
                                  className={cellBaseClass('sedang', 'text-right whitespace-nowrap')}
                                  onClick={() => startEdit(tx, 'sedang')}
                                  title="Klik untuk mengedit Sedang"
                                >
                                  {isCellEditing('sedang') ? (
                                    <input
                                      ref={inputRef as any}
                                      type="number"
                                      step="0.01"
                                      value={editValue}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={(e) => saveInlineEdit(tx, 'sedang', e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveInlineEdit(tx, 'sedang', (e.target as HTMLInputElement).value);
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="w-20 px-1 py-0.5 text-right text-xs font-semibold rounded border border-emerald-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                                    />
                                  ) : (
                                    <span className="text-slate-500">
                                      {tx.sedang && tx.sedang > 0 ? tx.sedang.toFixed(2) : '-'}
                                    </span>
                                  )}
                                </td>

                                {/* 9. Kecil (Inline Editable) */}
                                <td
                                  className={cellBaseClass('kecil', 'text-right whitespace-nowrap')}
                                  onClick={() => startEdit(tx, 'kecil')}
                                  title="Klik untuk mengedit Kecil"
                                >
                                  {isCellEditing('kecil') ? (
                                    <input
                                      ref={inputRef as any}
                                      type="number"
                                      step="0.01"
                                      value={editValue}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={(e) => saveInlineEdit(tx, 'kecil', e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveInlineEdit(tx, 'kecil', (e.target as HTMLInputElement).value);
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="w-20 px-1 py-0.5 text-right text-xs font-semibold rounded border border-emerald-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                                    />
                                  ) : (
                                    <span className="text-slate-500">
                                      {tx.kecil && tx.kecil > 0 ? tx.kecil.toFixed(2) : '-'}
                                    </span>
                                  )}
                                </td>

                                {/* Extra Kecil (Inline Editable) */}
                                <td
                                  className={cellBaseClass('extraKecil', 'text-right whitespace-nowrap')}
                                  onClick={() => startEdit(tx, 'extraKecil')}
                                  title="Klik untuk mengedit Extra Kecil"
                                >
                                  {isCellEditing('extraKecil') ? (
                                    <input
                                      ref={inputRef as any}
                                      type="number"
                                      step="0.01"
                                      value={editValue}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={(e) => saveInlineEdit(tx, 'extraKecil', e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveInlineEdit(tx, 'extraKecil', (e.target as HTMLInputElement).value);
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="w-20 px-1 py-0.5 text-right text-xs font-semibold rounded border border-emerald-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                                    />
                                  ) : (
                                    <span className="text-slate-500">
                                      {tx.extraKecil && tx.extraKecil > 0 ? tx.extraKecil.toFixed(2) : '-'}
                                    </span>
                                  )}
                                </td>

                                {/* 10. Total (Ha) (Inline Editable & Auto-Recalculate Master) */}
                                <td
                                  className={cellBaseClass(
                                    'total',
                                    'text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap'
                                  )}
                                  onClick={() => startEdit(tx, 'total')}
                                  title="Klik untuk mengedit Total Volume"
                                >
                                  {isCellEditing('total') ? (
                                    <input
                                      ref={inputRef as any}
                                      type="number"
                                      step="0.01"
                                      value={editValue}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={(e) => saveInlineEdit(tx, 'total', e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveInlineEdit(tx, 'total', (e.target as HTMLInputElement).value);
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="w-20 px-1 py-0.5 text-right text-xs font-bold rounded border border-emerald-500 bg-white dark:bg-slate-950 text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                                    />
                                  ) : (
                                    <span>{tx.total > 0 ? tx.total.toFixed(2) : '0.00'}</span>
                                  )}
                                </td>

                                {/* 11. Jenis Bibit (Inline Editable Dropdown) */}
                                <td
                                  className={cellBaseClass('jenisBibit', 'whitespace-nowrap font-sans')}
                                  onClick={() => startEdit(tx, 'jenisBibit')}
                                  title="Klik untuk mengubah Jenis Bibit"
                                >
                                  {isCellEditing('jenisBibit') ? (
                                    <select
                                      ref={inputRef as any}
                                      value={editValue}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEditValue(val);
                                        saveInlineEdit(tx, 'jenisBibit', val);
                                      }}
                                      onBlur={(e) => saveInlineEdit(tx, 'jenisBibit', e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="px-1.5 py-0.5 text-xs font-semibold rounded border border-emerald-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                                    >
                                      <option value="">Pilih</option>
                                      <option value="Crown">Crown</option>
                                      <option value="Sucker">Sucker</option>
                                    </select>
                                  ) : (
                                    <span className="text-slate-700 dark:text-slate-300">
                                      {tx.jenisBibit || '-'}
                                    </span>
                                  )}
                                </td>

                                {/* 12. Wilayah (Inline Editable) */}
                                <td
                                  className={cellBaseClass('wilayah', 'whitespace-nowrap font-sans')}
                                  onClick={() => startEdit(tx, 'wilayah')}
                                  title="Klik untuk mengedit Wilayah"
                                >
                                  {isCellEditing('wilayah') ? (
                                    <input
                                      ref={inputRef as any}
                                      type="text"
                                      value={editValue}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={(e) => saveInlineEdit(tx, 'wilayah', e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveInlineEdit(tx, 'wilayah', (e.target as HTMLInputElement).value);
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      placeholder="Timur / Barat"
                                      className="w-16 px-1.5 py-0.5 text-xs font-semibold rounded border border-emerald-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                                    />
                                  ) : (
                                    <span className="text-slate-600 dark:text-slate-400">
                                      {tx.wilayah || '-'}
                                    </span>
                                  )}
                                </td>

                                {/* 13. Awal Tanam (Date Picker) */}
                                <td className={cellBaseClass('awalTanam', 'text-center font-sans whitespace-nowrap')}>
                                  <div onClick={(e) => e.stopPropagation()} className="flex justify-center items-center">
                                    <TableDatePicker
                                      value={tx.awalTanam}
                                      align="center"
                                      formatDisplay="full"
                                      onChange={(newDate) => saveInlineEdit(tx, 'awalTanam', newDate)}
                                    />
                                  </div>
                                </td>

                                {/* 14. Selesai Tanam (Date Picker) */}
                                <td className={cellBaseClass('selesaiTanam', 'text-center font-sans whitespace-nowrap')}>
                                  <div onClick={(e) => e.stopPropagation()} className="flex justify-center items-center">
                                    <TableDatePicker
                                      value={tx.selesaiTanam}
                                      align="center"
                                      formatDisplay="full"
                                      onChange={(newDate) => saveInlineEdit(tx, 'selesaiTanam', newDate)}
                                    />
                                  </div>
                                </td>

                                {/* 15. Akum Tanam (Inline Editable) */}
                                <td
                                  className={cellBaseClass('akumTanam', 'text-right whitespace-nowrap')}
                                  onClick={() => startEdit(tx, 'akumTanam')}
                                  title="Klik untuk mengedit Akum Tanam"
                                >
                                  {isCellEditing('akumTanam') ? (
                                    <input
                                      ref={inputRef as any}
                                      type="number"
                                      step="0.01"
                                      value={editValue}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={(e) => saveInlineEdit(tx, 'akumTanam', e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveInlineEdit(tx, 'akumTanam', (e.target as HTMLInputElement).value);
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="w-20 px-1 py-0.5 text-right text-xs font-semibold rounded border border-emerald-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                                    />
                                  ) : (
                                    <span className="text-slate-600 dark:text-slate-400">
                                      {tx.akumTanam && tx.akumTanam > 0
                                        ? tx.akumTanam.toFixed(2)
                                        : tx.akumTanam === 0
                                        ? '0.00'
                                        : '-'}
                                    </span>
                                  )}
                                </td>

                                {/* 16. % Tanam (Inline Editable) */}
                                <td
                                  className={cellBaseClass('persenTanam', 'text-center font-sans whitespace-nowrap')}
                                  onClick={() => startEdit(tx, 'persenTanam')}
                                  title="Klik untuk mengedit % Tanam"
                                >
                                  {isCellEditing('persenTanam') ? (
                                    <input
                                      ref={inputRef as any}
                                      type="number"
                                      step="0.1"
                                      value={editValue}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={(e) => saveInlineEdit(tx, 'persenTanam', e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveInlineEdit(tx, 'persenTanam', (e.target as HTMLInputElement).value);
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="w-20 px-1 py-0.5 text-center text-xs font-semibold rounded border border-emerald-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                                    />
                                  ) : (
                                    <span className="text-slate-600 dark:text-slate-400">
                                      {tx.persenTanam !== null && tx.persenTanam !== undefined
                                        ? tx.persenTanam > 0 && tx.persenTanam < 1
                                          ? `${(tx.persenTanam * 100).toFixed(1)}%`
                                          : `${tx.persenTanam}%`
                                        : '-'}
                                    </span>
                                  )}
                                </td>

                                {/* 17. Petik Ke- (Inline Editable) */}
                                <td
                                  className={`py-2 px-2.5 text-center font-sans whitespace-nowrap transition-colors cursor-pointer select-none ${
                                    isCellSuccess('petikKe')
                                      ? 'bg-emerald-100/70 dark:bg-emerald-900/50 ring-1 ring-emerald-500'
                                      : isCellSaving('petikKe')
                                      ? 'opacity-60 bg-amber-50 dark:bg-amber-950/30'
                                      : 'hover:bg-emerald-50/40 dark:hover:bg-slate-800/60'
                                  }`}
                                  onClick={() => startEdit(tx, 'petikKe')}
                                  title="Klik untuk mengedit Petik Ke-"
                                >
                                  {isCellEditing('petikKe') ? (
                                    <input
                                      ref={inputRef as any}
                                      type="text"
                                      value={editValue}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={(e) => saveInlineEdit(tx, 'petikKe', e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveInlineEdit(tx, 'petikKe', (e.target as HTMLInputElement).value);
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="w-16 px-1 py-0.5 text-center text-xs font-semibold rounded border border-emerald-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                                    />
                                  ) : (
                                    <span className="text-slate-600 dark:text-slate-400">
                                      {tx.petikKe || '-'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Tambah Transaksi Harian (Locked ke Lokasi Ini) */}
      <AddPlantingTransactionModal
        isOpen={isAddTxModalOpen}
        onClose={() => setIsAddTxModalOpen(false)}
        lockedLokasi={master?.lokasi || lokasi}
        onSuccess={() => {
          if (lokasi) fetchDetail(lokasi);
          onTransactionSaved?.();
        }}
      />
    </div>
  );
}
