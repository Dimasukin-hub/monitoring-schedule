'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Calendar,
  Layers,
  MapPin,
  Shield,
  User,
  ChevronDown,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface LocationSlot {
  id: string;
  selectedLokasi: string;
  autoWilayah: string;
  searchLokasiInput: string;
  isDropdownOpen: boolean;

  selectedLokasiPengirim: string;
  autoWilayahPengirim: string;
  searchLokasiPengirimInput: string;
  isDropdownPengirimOpen: boolean;

  selectedLokasiPenerima: string;
  autoWilayahPenerima: string;
  searchLokasiPenerimaInput: string;
  isDropdownPenerimaOpen: boolean;

  qtyD40: string;
  qtyD60: string;
  qtyD80: string;
  qtyD100: string;
}

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function FormOrderGorongGorongView() {
  const { user, isAdmin, isUser, isUserFE, isUserWilayah } = useAuth();

  // State Form Multi-Lokasi: Default 3 Slot
  const createEmptySlot = (id: string): LocationSlot => ({
    id,
    selectedLokasi: '',
    autoWilayah: '',
    searchLokasiInput: '',
    isDropdownOpen: false,

    selectedLokasiPengirim: '',
    autoWilayahPengirim: '',
    searchLokasiPengirimInput: '',
    isDropdownPengirimOpen: false,

    selectedLokasiPenerima: '',
    autoWilayahPenerima: '',
    searchLokasiPenerimaInput: '',
    isDropdownPenerimaOpen: false,

    qtyD40: '',
    qtyD60: '',
    qtyD80: '',
    qtyD100: '',
  });

  const [slots, setSlots] = useState<LocationSlot[]>([
    createEmptySlot('slot-1'),
    createEmptySlot('slot-2'),
    createEmptySlot('slot-3'),
  ]);

  // Global Form Fields
  const [jenisTransaksi, setJenisTransaksi] = useState<'ORDER' | 'DROP' | 'PASANG_MANUAL' | ''>('');
  const [isJenisDropdownOpen, setIsJenisDropdownOpen] = useState<boolean>(false);
  const [tanggal, setTanggal] = useState<string>('');
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [keterangan, setKeterangan] = useState<string>('');

  // Auto-set default jenis transaksi sesuai role user
  useEffect(() => {
    if (isUserFE) {
      setJenisTransaksi('DROP');
    } else if (isUserWilayah) {
      setJenisTransaksi('ORDER');
    }
  }, [isUserFE, isUserWilayah]);

  // Calendar View State
  const initialDate = new Date();
  const [calendarYear, setCalendarYear] = useState<number>(initialDate.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(initialDate.getMonth());

  // Master Data & Riwayat
  const [masterLokasiList, setMasterLokasiList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Load Daftar Master Lokasi
  useEffect(() => {
    fetch('/api/gorong-gorong/master-lokasi?all=true')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setMasterLokasiList(res.data);
        }
      })
      .catch((e) => console.error('Error fetching master lokasi:', e));
  }, []);

  // 2. Load Riwayat Transaksi
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/gorong-gorong/order?limit=25');
      const data = await res.json();
      if (data.success) {
        setHistoryList(data.data);
      }
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Click Outside Listener untuk menutup dropdown & kalender
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.lokasi-pengirim-dropdown-container') && !target.closest('.lokasi-penerima-dropdown-container') && !target.closest('.lokasi-dropdown-container')) {
        setSlots((prev) =>
          prev.map((s) => ({
            ...s,
            isDropdownOpen: false,
            isDropdownPengirimOpen: false,
            isDropdownPenerimaOpen: false,
          }))
        );
      }
      if (!target.closest('.jenis-dropdown-container')) {
        setIsJenisDropdownOpen(false);
      }
      if (!target.closest('.datepicker-container')) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper Update Slot
  const updateSlot = (id: string, updates: Partial<LocationSlot>) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  // Tambah Slot Baru
  const handleAddSlot = () => {
    setSlots((prev) => [...prev, createEmptySlot(`slot-${Date.now()}`)]);
  };

  // Hapus Slot
  const handleRemoveSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  // Reset Seluruh Form
  const handleResetForm = () => {
    setSlots([
      createEmptySlot('slot-1'),
      createEmptySlot('slot-2'),
      createEmptySlot('slot-3'),
    ]);
    setJenisTransaksi('');
    setTanggal('');
    setKeterangan('');
    setNotification(null);
  };

  // Format Display Tanggal DD/MM/YYYY
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr || dateStr === '-') return 'Pilih Tanggal';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Render Grid Kalender Popover
  const renderCalendarGrid = () => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 = Minggu
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    const blanks = Array.from({ length: firstDayIndex });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const isCurrentSelected = (d: number) => {
      const target = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return tanggal === target;
    };

    return (
      <div className="space-y-2">
        {/* Day Name Headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
          {dayNames.map((n) => (
            <div key={n} className="py-1">{n}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="p-1.5" />
          ))}
          {days.map((d) => {
            const selected = isCurrentSelected(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  const newDate = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  setTanggal(newDate);
                  setIsCalendarOpen(false);
                }}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selected
                    ? 'bg-[#00873D] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Submit Handler Multi-Slot Batch
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!jenisTransaksi) {
      setNotification({
        type: 'error',
        message: 'Silakan pilih Jenis Data terlebih dahulu (Order, Drop, atau Pasang Manual).',
      });
      return;
    }

    // Auto-resolve slots yang diketik manual jika belum dipilih lewat dropdown
    const resolvedSlots = slots.map((s) => {
      let pengirim = s.selectedLokasiPengirim;
      let wilPengirim = s.autoWilayahPengirim;
      if (!pengirim && s.searchLokasiPengirimInput.trim()) {
        const cleanInput = s.searchLokasiPengirimInput.trim().toUpperCase();
        const found = masterLokasiList.find((m) => m.lokasi.trim().toUpperCase() === cleanInput);
        pengirim = found ? found.lokasi : cleanInput;
        wilPengirim = found?.strucPlant || 'AW01';
      }

      let penerima = s.selectedLokasiPenerima || s.selectedLokasi;
      let wilPenerima = s.autoWilayahPenerima || s.autoWilayah;
      if (!penerima && s.searchLokasiPenerimaInput.trim()) {
        const cleanInput = s.searchLokasiPenerimaInput.trim().toUpperCase();
        const found = masterLokasiList.find((m) => m.lokasi.trim().toUpperCase() === cleanInput);
        penerima = found ? found.lokasi : cleanInput;
        wilPenerima = found?.strucPlant || 'AW01';
      } else if (!penerima && s.searchLokasiInput.trim()) {
        const cleanInput = s.searchLokasiInput.trim().toUpperCase();
        const found = masterLokasiList.find((m) => m.lokasi.trim().toUpperCase() === cleanInput);
        penerima = found ? found.lokasi : cleanInput;
        wilPenerima = found?.strucPlant || 'AW01';
      }

      return {
        ...s,
        selectedLokasiPengirim: pengirim,
        autoWilayahPengirim: wilPengirim,
        selectedLokasiPenerima: penerima,
        autoWilayahPenerima: wilPenerima,
      };
    });

    // Filter slot yang terisi lokasi (pengirim atau penerima)
    const filledSlots = resolvedSlots.filter(
      (s) => s.selectedLokasiPenerima.trim() !== '' || s.selectedLokasiPengirim.trim() !== ''
    );

    if (filledSlots.length === 0) {
      setNotification({
        type: 'error',
        message: 'Silakan pilih lokasi pengirim dan/atau lokasi penerima, serta isi jumlah gorong-gorong.',
      });
      return;
    }

    // Validasi kuantiti per slot
    for (const s of filledSlots) {
      const n40 = parseInt(s.qtyD40 || '0', 10);
      const n60 = parseInt(s.qtyD60 || '0', 10);
      const n80 = parseInt(s.qtyD80 || '0', 10);
      const n100 = parseInt(s.qtyD100 || '0', 10);

      if (n40 === 0 && n60 === 0 && n80 === 0 && n100 === 0) {
        const targetName = s.selectedLokasiPenerima || s.selectedLokasiPengirim;
        setNotification({
          type: 'error',
          message: `Minimal salah satu diameter (Ø40, Ø60, Ø80, atau Ø100) pada lokasi ${targetName} harus diisi lebih dari 0.`,
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payloadItems = filledSlots.map((s) => {
        const destLok = s.selectedLokasiPenerima || s.selectedLokasiPengirim;
        const srcLok = s.selectedLokasiPengirim && s.selectedLokasiPenerima && s.selectedLokasiPengirim !== s.selectedLokasiPenerima
          ? s.selectedLokasiPengirim
          : null;
        const wil = s.autoWilayahPenerima || s.autoWilayahPengirim || 'AW01';

        return {
          lokasi: destLok,
          lokasiPenerima: destLok,
          lokasiPengirim: srcLok,
          wilayah: wil,
          jenisTransaksi,
          qtyD40: parseInt(s.qtyD40 || '0', 10),
          qtyD60: parseInt(s.qtyD60 || '0', 10),
          qtyD80: parseInt(s.qtyD80 || '0', 10),
          qtyD100: parseInt(s.qtyD100 || '0', 10),
          tanggal,
          keterangan,
          createdBy: user?.name || (isAdmin ? 'Admin' : (isUserFE ? 'User FE' : 'User Wilayah')),
          userRole: isAdmin ? 'ADMIN' : (isUserFE ? 'USER_FE' : 'USER_WILAYAH'),
        };
      });

      const res = await fetch('/api/gorong-gorong/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payloadItems }),
      });

      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        handleResetForm();
        loadHistory();
        // Trigger auto-refresh pada modul Monitor Gorong-Gorong
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gorong_gorong_updated'));
        }
      } else {
        setNotification({ type: 'error', message: data.message });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Terjadi kesalahan sistem saat menyimpan.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleDeleteTrx = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data riwayat transaksi ini?')) return;
    try {
      const res = await fetch(`/api/gorong-gorong/order?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || (isAdmin ? 'admin' : 'user'),
        },
      });
      const data = await res.json();
      if (data.success) {
        setHistoryList((prev) => prev.filter((r) => r.id !== id));
        setNotification({ type: 'success', message: data.message || 'Transaksi berhasil dihapus.' });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gorong_gorong_updated'));
        }
      } else {
        setNotification({ type: 'error', message: data.message || 'Gagal menghapus transaksi.' });
      }
    } catch (e: any) {
      console.error('Error deleting transaction:', e);
      setNotification({ type: 'error', message: e.message || 'Terjadi kesalahan sistem saat menghapus transaksi.' });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* 1. HEADER INFO & ROLE BADGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-xs backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F58220] shadow-[0_0_8px_#F58220]" />
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Form Order & Input Gorong-Gorong
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Formulir pencatatan permintaan kebutuhan (Order), konfirmasi pengiriman (Drop), dan pemasangan manual di lapangan.
          </p>
        </div>

        {/* User Role Indicator (Sejajar dan muat rapi dalam card) */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
          <div className="p-1.5 rounded-lg bg-[#00873D]/15 text-[#00873D] shrink-0">
            {isAdmin ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
          </div>
          <div className="text-left whitespace-nowrap">
            <span className="text-[10px] block text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">
              Hak Akses
            </span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              {isAdmin
                ? 'Admin (Akses Penuh: Order, Drop, Pasang)'
                : isUserFE
                ? 'User FE (Khusus Drop)'
                : 'User Wilayah (Order & Pasang Manual)'}
            </span>
          </div>
        </div>
      </div>

      {/* NOTIFIKASI FEEDBACK */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border text-xs font-semibold animate-in slide-in-from-top-2 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 2. KARTU FORMULIR INPUT */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs backdrop-blur-md">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Header Global: Jenis Data & Tanggal Transaksi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 p-3 sm:p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            {/* Dropdown Jenis Data dengan panah berputar */}
            <div className="relative jenis-dropdown-container">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-[#009EE2]" />
                <span>Jenis Data *</span>
              </label>

              <div
                onClick={() => setIsJenisDropdownOpen((prev) => !prev)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between cursor-pointer shadow-2xs hover:border-[#00873D] transition-colors"
              >
                <span className={!jenisTransaksi ? 'text-slate-400 font-normal' : ''}>
                  {jenisTransaksi === 'ORDER'
                    ? 'Order'
                    : jenisTransaksi === 'DROP'
                    ? 'Drop'
                    : jenisTransaksi === 'PASANG_MANUAL'
                    ? 'Pasang Manual'
                    : 'Pilih Jenis Transaksi'}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isJenisDropdownOpen ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </div>

              {isJenisDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-150">
                  {/* Order: Ditampilkan untuk Admin dan User Wilayah */}
                  {(isAdmin || isUserWilayah || (!isUserFE && !isAdmin)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setJenisTransaksi('ORDER');
                        setIsJenisDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                        jenisTransaksi === 'ORDER'
                          ? 'bg-[#00873D]/10 text-[#00873D]'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span>Order</span>
                      {jenisTransaksi === 'ORDER' && <span className="w-1.5 h-1.5 rounded-full bg-[#00873D]" />}
                    </button>
                  )}

                  {/* Drop: Ditampilkan untuk Admin dan User FE */}
                  {(isAdmin || isUserFE) && (
                    <button
                      type="button"
                      onClick={() => {
                        setJenisTransaksi('DROP');
                        setIsJenisDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                        jenisTransaksi === 'DROP'
                          ? 'bg-[#00873D]/10 text-[#00873D]'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span>Drop</span>
                      {jenisTransaksi === 'DROP' && <span className="w-1.5 h-1.5 rounded-full bg-[#00873D]" />}
                    </button>
                  )}

                  {/* Pasang Manual: Ditampilkan untuk Admin dan User Wilayah */}
                  {(isAdmin || isUserWilayah || (!isUserFE && !isAdmin)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setJenisTransaksi('PASANG_MANUAL');
                        setIsJenisDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                        jenisTransaksi === 'PASANG_MANUAL'
                          ? 'bg-[#00873D]/10 text-[#00873D]'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span>Pasang Manual</span>
                      {jenisTransaksi === 'PASANG_MANUAL' && <span className="w-1.5 h-1.5 rounded-full bg-[#00873D]" />}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Datepicker: Seluruh area kolom dapat diklik */}
            <div className="relative datepicker-container">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Tanggal Transaksi</span>
              </label>

              <div
                onClick={() => setIsCalendarOpen((prev) => !prev)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between cursor-pointer shadow-2xs hover:border-[#00873D] transition-colors"
              >
                <span className={!tanggal ? 'text-slate-400' : ''}>{formatDateDisplay(tanggal)}</span>
                <Calendar className="w-4 h-4 text-slate-400" />
              </div>

              {/* Popover Kalender Ala Tabel Data Lahan */}
              {isCalendarOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Month & Year Navigation */}
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (calendarMonth === 0) {
                          setCalendarMonth(11);
                          setCalendarYear((y) => y - 1);
                        } else {
                          setCalendarMonth((m) => m - 1);
                        }
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </button>

                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {INDONESIAN_MONTHS[calendarMonth]} {calendarYear}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (calendarMonth === 11) {
                          setCalendarMonth(0);
                          setCalendarYear((y) => y + 1);
                        } else {
                          setCalendarMonth((m) => m + 1);
                        }
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </button>
                  </div>

                  {/* Kalender Grid */}
                  {renderCalendarGrid()}

                  {/* Tombol Pintas Kosongkan & Hari Ini */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setTanggal('');
                        setIsCalendarOpen(false);
                      }}
                      className="text-[11px] font-bold text-red-500 hover:text-red-600 hover:underline cursor-pointer"
                    >
                      Kosongkan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setCalendarYear(now.getFullYear());
                        setCalendarMonth(now.getMonth());
                        setTanggal(now.toISOString().slice(0, 10));
                        setIsCalendarOpen(false);
                      }}
                      className="text-[11px] font-bold text-[#00873D] hover:underline cursor-pointer"
                    >
                      Hari Ini
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DAFTAR SLOT LOKASI (DEFAULT 3 SLOT) */}
          <div className="space-y-4">
            {slots.map((slot, index) => {
              const filteredPengirimOptions = masterLokasiList
                .filter((item) =>
                  item.lokasi.toUpperCase().includes((slot.searchLokasiPengirimInput || '').toUpperCase())
                )
                .slice(0, 30);

              const filteredPenerimaOptions = masterLokasiList
                .filter((item) =>
                  item.lokasi.toUpperCase().includes((slot.searchLokasiPenerimaInput || '').toUpperCase())
                )
                .slice(0, 30);

              return (
                <div
                  key={slot.id}
                  className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800/30 border-2 border-slate-200 dark:border-slate-700 shadow-2xs space-y-3 sm:space-y-3.5 relative"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-xs font-black text-[#00873D] dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00873D]" />
                      Lokasi {index + 1}
                    </span>

                    {slots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(slot.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title={`Hapus Lokasi ${index + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dua Kotak Pilih Lokasi: Lokasi Pengirim (Asal) & Lokasi Penerima (Tujuan) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {/* Kotak 1: Lokasi Pengirim (Asal) */}
                    <div className="relative lokasi-pengirim-dropdown-container">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span>Lokasi Pengirim (Asal)</span>
                        </label>
                        {slot.autoWilayahPengirim && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            Wilayah: {slot.autoWilayahPengirim}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={slot.searchLokasiPengirimInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            const match = masterLokasiList.find(
                              (item) => item.lokasi.trim().toUpperCase() === val.trim().toUpperCase()
                            );
                            updateSlot(slot.id, {
                              searchLokasiPengirimInput: val,
                              isDropdownPengirimOpen: true,
                              selectedLokasiPengirim: match ? match.lokasi : val.trim().toUpperCase(),
                              autoWilayahPengirim: match ? (match.strucPlant || 'AW01') : slot.autoWilayahPengirim,
                            });
                          }}
                          onBlur={() => {
                            if (slot.searchLokasiPengirimInput.trim()) {
                              const match = masterLokasiList.find(
                                (item) => item.lokasi.trim().toUpperCase() === slot.searchLokasiPengirimInput.trim().toUpperCase()
                              );
                              if (match) {
                                updateSlot(slot.id, {
                                  selectedLokasiPengirim: match.lokasi,
                                  autoWilayahPengirim: match.strucPlant || 'AW01',
                                  searchLokasiPengirimInput: match.lokasi,
                                });
                              }
                            }
                          }}
                          onFocus={() => updateSlot(slot.id, { isDropdownPengirimOpen: true })}
                          placeholder="Pilih lokasi pengirim / asal..."
                          className="w-full pl-3.5 pr-9 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border-2 border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        />

                        {slot.searchLokasiPengirimInput ? (
                          <button
                            type="button"
                            onClick={() => {
                              updateSlot(slot.id, {
                                searchLokasiPengirimInput: '',
                                selectedLokasiPengirim: '',
                                autoWilayahPengirim: '',
                                isDropdownPengirimOpen: false,
                              });
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                            title="Hapus / Reset Lokasi Pengirim"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        )}
                      </div>

                      {/* Dropdown Options Pengirim */}
                      {slot.isDropdownPengirimOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin">
                          {filteredPengirimOptions.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-400 text-center">Lokasi tidak ditemukan</div>
                          ) : (
                            filteredPengirimOptions.map((opt) => (
                              <button
                                key={`pengirim-${opt.lokasi}`}
                                type="button"
                                onClick={() => {
                                  updateSlot(slot.id, {
                                    selectedLokasiPengirim: opt.lokasi,
                                    autoWilayahPengirim: opt.strucPlant || 'AW01',
                                    searchLokasiPengirimInput: opt.lokasi,
                                    isDropdownPengirimOpen: false,
                                  });
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer transition-colors"
                              >
                                <span className="font-bold text-rose-600 dark:text-rose-400">{opt.lokasi}</span>
                                <span className="text-[11px] text-slate-500 font-semibold">{opt.strucPlant || 'AW01'}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Kotak 2: Lokasi Penerima (Tujuan) */}
                    <div className="relative lokasi-penerima-dropdown-container">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#00873D]" />
                          <span>Lokasi Penerima (Tujuan) *</span>
                        </label>
                        {slot.autoWilayahPenerima && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-[#00873D] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Wilayah: {slot.autoWilayahPenerima}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={slot.searchLokasiPenerimaInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            const match = masterLokasiList.find(
                              (item) => item.lokasi.trim().toUpperCase() === val.trim().toUpperCase()
                            );
                            updateSlot(slot.id, {
                              searchLokasiPenerimaInput: val,
                              isDropdownPenerimaOpen: true,
                              selectedLokasiPenerima: match ? match.lokasi : val.trim().toUpperCase(),
                              autoWilayahPenerima: match ? (match.strucPlant || 'AW01') : slot.autoWilayahPenerima,
                            });
                          }}
                          onBlur={() => {
                            if (slot.searchLokasiPenerimaInput.trim()) {
                              const match = masterLokasiList.find(
                                (item) => item.lokasi.trim().toUpperCase() === slot.searchLokasiPenerimaInput.trim().toUpperCase()
                              );
                              if (match) {
                                updateSlot(slot.id, {
                                  selectedLokasiPenerima: match.lokasi,
                                  autoWilayahPenerima: match.strucPlant || 'AW01',
                                  searchLokasiPenerimaInput: match.lokasi,
                                });
                              }
                            }
                          }}
                          onFocus={() => updateSlot(slot.id, { isDropdownPenerimaOpen: true })}
                          placeholder="Pilih lokasi penerima / tujuan..."
                          className="w-full pl-3.5 pr-9 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border-2 border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#00873D] focus:ring-1 focus:ring-[#00873D]"
                        />

                        {slot.searchLokasiPenerimaInput ? (
                          <button
                            type="button"
                            onClick={() => {
                              updateSlot(slot.id, {
                                searchLokasiPenerimaInput: '',
                                selectedLokasiPenerima: '',
                                autoWilayahPenerima: '',
                                isDropdownPenerimaOpen: false,
                              });
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                            title="Hapus / Reset Lokasi Penerima"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        )}
                      </div>

                      {/* Dropdown Options Penerima */}
                      {slot.isDropdownPenerimaOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin">
                          {filteredPenerimaOptions.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-400 text-center">Lokasi tidak ditemukan</div>
                          ) : (
                            filteredPenerimaOptions.map((opt) => (
                              <button
                                key={`penerima-${opt.lokasi}`}
                                type="button"
                                onClick={() => {
                                  updateSlot(slot.id, {
                                    selectedLokasiPenerima: opt.lokasi,
                                    autoWilayahPenerima: opt.strucPlant || 'AW01',
                                    searchLokasiPenerimaInput: opt.lokasi,
                                    isDropdownPenerimaOpen: false,
                                  });
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer transition-colors"
                              >
                                <span className="font-bold text-[#00873D]">{opt.lokasi}</span>
                                <span className="text-[11px] text-slate-500 font-semibold">{opt.strucPlant || 'AW01'}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Baris 2: Jumlah Gorong-Gorong (Maksimal 3 Angka) */}
                  <div>
                    <div className="mb-2">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#00873D]" />
                        Jumlah Gorong-Gorong (Maksimal 3 Angka)
                      </label>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                      {/* Kotak 1: Ø40 */}
                      <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border-2 border-emerald-500/40 dark:border-emerald-500/60 focus-within:border-emerald-500 transition-all text-center sm:text-left shadow-2xs">
                        <span className="text-[10px] sm:text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 block mb-0.5 sm:mb-1 truncate">
                          Diameter 40 (Ø40)
                        </span>
                        <input
                          type="text"
                          maxLength={3}
                          value={slot.qtyD40}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/\D/g, '').slice(0, 3);
                            updateSlot(slot.id, { qtyD40: clean });
                          }}
                          placeholder="0"
                          className="w-full text-center text-base sm:text-lg font-mono font-black text-slate-900 dark:text-white bg-transparent focus:outline-none py-0.5 sm:py-1"
                        />
                        <span className="text-[9px] sm:text-[10px] text-slate-400 block text-center mt-0.5 font-semibold">pcs</span>
                      </div>

                      {/* Kotak 2: Ø60 */}
                      <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border-2 border-blue-500/40 dark:border-blue-500/60 focus-within:border-blue-500 transition-all text-center sm:text-left shadow-2xs">
                        <span className="text-[10px] sm:text-[11px] font-extrabold text-blue-800 dark:text-blue-300 block mb-0.5 sm:mb-1 truncate">
                          Diameter 60 (Ø60)
                        </span>
                        <input
                          type="text"
                          maxLength={3}
                          value={slot.qtyD60}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/\D/g, '').slice(0, 3);
                            updateSlot(slot.id, { qtyD60: clean });
                          }}
                          placeholder="0"
                          className="w-full text-center text-base sm:text-lg font-mono font-black text-slate-900 dark:text-white bg-transparent focus:outline-none py-0.5 sm:py-1"
                        />
                        <span className="text-[9px] sm:text-[10px] text-slate-400 block text-center mt-0.5 font-semibold">pcs</span>
                      </div>

                      {/* Kotak 3: Ø80 */}
                      <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border-2 border-amber-500/40 dark:border-amber-500/60 focus-within:border-amber-500 transition-all text-center sm:text-left shadow-2xs">
                        <span className="text-[10px] sm:text-[11px] font-extrabold text-amber-800 dark:text-amber-300 block mb-0.5 sm:mb-1 truncate">
                          Diameter 80 (Ø80)
                        </span>
                        <input
                          type="text"
                          maxLength={3}
                          value={slot.qtyD80}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/\D/g, '').slice(0, 3);
                            updateSlot(slot.id, { qtyD80: clean });
                          }}
                          placeholder="0"
                          className="w-full text-center text-base sm:text-lg font-mono font-black text-slate-900 dark:text-white bg-transparent focus:outline-none py-0.5 sm:py-1"
                        />
                        <span className="text-[9px] sm:text-[10px] text-slate-400 block text-center mt-0.5 font-semibold">pcs</span>
                      </div>

                      {/* Kotak 4: Ø100 */}
                      <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-purple-500/5 dark:bg-purple-500/10 border-2 border-purple-500/40 dark:border-purple-500/60 focus-within:border-purple-500 transition-all text-center sm:text-left shadow-2xs">
                        <span className="text-[10px] sm:text-[11px] font-extrabold text-purple-800 dark:text-purple-300 block mb-0.5 sm:mb-1 truncate">
                          Diameter 100 (Ø100)
                        </span>
                        <input
                          type="text"
                          maxLength={3}
                          value={slot.qtyD100}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/\D/g, '').slice(0, 3);
                            updateSlot(slot.id, { qtyD100: clean });
                          }}
                          placeholder="0"
                          className="w-full text-center text-base sm:text-lg font-mono font-black text-slate-900 dark:text-white bg-transparent focus:outline-none py-0.5 sm:py-1"
                        />
                        <span className="text-[9px] sm:text-[10px] text-slate-400 block text-center mt-0.5 font-semibold">pcs</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Baris Catatan / Keterangan (Opsional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Catatan / Keterangan (Opsional)
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder=""
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border-2 border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#00873D] focus:ring-1 focus:ring-[#00873D]"
            />
          </div>

          {/* Baris Aksi Bawah: Tombol Tambah Lokasi & Simpan */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            {/* Tombol Tambah Lokasi */}
            <button
              type="button"
              onClick={handleAddSlot}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-[#00873D] text-[#00873D] dark:text-emerald-400 hover:bg-[#00873D]/10 text-xs font-bold transition-all cursor-pointer w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Lokasi</span>
            </button>

            {/* Actions: Reset Form & Simpan (Tanpa simbol plus) */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleResetForm}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer text-center"
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#00873D] hover:bg-[#006e31] text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 text-center"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </span>
                ) : (
                  'Simpan'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. TABEL RIWAYAT INPUT (Alignment Tengah, Header Diameter, Kolom No) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Riwayat Input
          </h3>
        </div>

        <div className="overflow-x-auto max-h-[420px] scrollbar-thin rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-center border-separate border-spacing-0 text-xs whitespace-nowrap">
            <thead className="text-slate-700 dark:text-slate-200 font-bold">
              {/* Header Tier 1: Grup Header Diameter */}
              <tr className="h-[32px]">
                <th rowSpan={2} className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-center border-r border-b border-slate-200 dark:border-slate-700 w-12 font-bold">No</th>
                <th rowSpan={2} className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 text-center border-r border-b border-slate-200 dark:border-slate-700 font-bold">Tanggal</th>
                <th rowSpan={2} className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 text-center border-r border-b border-slate-200 dark:border-slate-700 font-bold">Jenis</th>
                <th rowSpan={2} className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 text-center border-r border-b border-slate-200 dark:border-slate-700 font-bold">Lokasi</th>
                <th rowSpan={2} className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-center border-r border-b border-slate-200 dark:border-slate-700 font-bold">Wilayah</th>
                <th colSpan={4} className="sticky top-0 z-20 px-3 py-1.5 text-center bg-slate-200 dark:bg-slate-700 border-r border-b border-slate-300 dark:border-slate-600 font-extrabold text-[#00873D] dark:text-emerald-400">
                  Diameter
                </th>
                <th rowSpan={2} className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 text-center border-r border-b border-slate-200 dark:border-slate-700 font-bold">Penginput</th>
                <th rowSpan={2} className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-center border-b border-slate-200 dark:border-slate-700 font-bold">Aksi</th>
              </tr>
              {/* Header Tier 2: Rincian 4 Diameter (100% Solid Pekat) */}
              <tr className="h-[28px]">
                <th className="sticky top-[32px] z-20 px-3 py-1 text-center bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-r border-b border-slate-200 dark:border-slate-700 font-bold">Ø40</th>
                <th className="sticky top-[32px] z-20 px-3 py-1 text-center bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-r border-b border-slate-200 dark:border-slate-700 font-bold">Ø60</th>
                <th className="sticky top-[32px] z-20 px-3 py-1 text-center bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-r border-b border-slate-200 dark:border-slate-700 font-bold">Ø80</th>
                <th className="sticky top-[32px] z-20 px-3 py-1 text-center bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-r border-b border-slate-200 dark:border-slate-700 font-bold">Ø100</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 dark:text-slate-300">
              {isLoadingHistory ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    Memuat riwayat transaksi...
                  </td>
                </tr>
              ) : historyList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    Belum ada riwayat transaksi.
                  </td>
                </tr>
              ) : (
                historyList.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors ${
                      idx % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-400 border-r border-b border-slate-200 dark:border-slate-800 text-center">
                      {idx + 1}
                    </td>
                    <td className="px-3.5 py-2 font-mono text-[11px] text-slate-500 border-r border-b border-slate-200 dark:border-slate-800 text-center">
                      {formatDateDisplay(new Date(item.tanggal).toISOString().slice(0, 10))}
                    </td>
                    <td className="px-3.5 py-2 border-r border-b border-slate-200 dark:border-slate-800 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.jenisTransaksi === 'ORDER'
                            ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                            : item.jenisTransaksi === 'DROP'
                            ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                            : 'bg-blue-500/15 text-blue-600 border border-blue-500/30'
                        }`}
                      >
                        {item.jenisTransaksi === 'ORDER' ? 'Order' : item.jenisTransaksi === 'DROP' ? 'Drop' : 'Pasang Manual'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 font-bold text-slate-900 dark:text-slate-100 border-r border-b border-slate-200 dark:border-slate-800 text-center">
                      {item.lokasiAsal ? (
                        <div className="inline-flex items-center justify-center gap-1 font-mono text-xs">
                          <span className="text-rose-600 dark:text-rose-400 font-bold" title="Lokasi Pengirim">{item.lokasiAsal}</span>
                          <span className="text-slate-400 text-[10px]">→</span>
                          <span className="text-[#00873D] dark:text-emerald-400 font-bold" title="Lokasi Penerima">{item.lokasi}</span>
                        </div>
                      ) : (
                        item.lokasi
                      )}
                    </td>
                    <td className="px-3 py-2 border-r border-b border-slate-200 dark:border-slate-800 text-center font-medium">
                      {item.wilayah || '-'}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-semibold text-slate-700 dark:text-slate-200 border-r border-b border-slate-200 dark:border-slate-800">
                      {item.qtyD40 || 0}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-semibold text-slate-700 dark:text-slate-200 border-r border-b border-slate-200 dark:border-slate-800">
                      {item.qtyD60 || 0}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-semibold text-slate-700 dark:text-slate-200 border-r border-b border-slate-200 dark:border-slate-800">
                      {item.qtyD80 || 0}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-semibold text-slate-700 dark:text-slate-200 border-r border-b border-slate-200 dark:border-slate-800">
                      {item.qtyD100 || 0}
                    </td>
                    <td className="px-3.5 py-2 text-[11px] text-slate-500 border-r border-b border-slate-200 dark:border-slate-800 text-center">
                      {item.createdBy} ({item.userRole})
                    </td>
                    <td className="px-3 py-2 text-center border-b border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleDeleteTrx(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer transition-colors"
                        title="Hapus Transaksi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
