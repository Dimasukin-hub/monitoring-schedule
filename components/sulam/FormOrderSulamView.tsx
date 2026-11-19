'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Send,
  CheckCircle2,
  Clock,
  Truck,
  CheckSquare,
  Search,
  RefreshCw,
  AlertCircle,
  Sparkles,
  User,
  ShieldCheck,
  Layers,
  Info,
  ChevronDown,
  Check,
  Printer,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const KELAS_BIBIT_OPTIONS = [
  'Sucker No. 0',
  'Sucker No. 1',
  'Sucker No. 2',
  'Sucker No. 3',
  'Sucker No. 4',
  'Sucker No. 5',
  'Sucker No. 6',
  'Crown No. 0',
  'Crown No. 1',
  'Crown No. 2',
  'Crown No. 3',
  'Crown No. 4',
  'Crown No. 5',
  'Crown No. 6',
];

interface GeneratedFormDoc {
  lokasi: string;
  wilayah: string;
  usiaDisplay: string;
  kelasBibit: string;
  ritCD: number;
  ritFuso: number;
  keterangan: string;
  dateStr: string;
}

export default function FormOrderSulamView() {
  const { user, isAdmin, isUserPlanting, isUserWilayah } = useAuth();

  // Form states
  const [lokasiList, setLokasiList] = useState<{ lokasi: string; wilayah: string | null }[]>([]);
  const [selectedLokasi, setSelectedLokasi] = useState('');
  const [lokasiSearch, setLokasiSearch] = useState('');
  const [isLokasiDropdownOpen, setIsLokasiDropdownOpen] = useState(false);

  const [wilayah, setWilayah] = useState('');
  const [usiaDisplay, setUsiaDisplay] = useState('');
  const [usiaVal, setUsiaVal] = useState<number | null>(null);

  const [kelasBibit, setKelasBibit] = useState('Sucker No. 0');
  const [isKelasDropdownOpen, setIsKelasDropdownOpen] = useState(false);

  const [ritCD, setRitCD] = useState<number | ''>('');
  const [ritFuso, setRitFuso] = useState<number | ''>('');
  const [keterangan, setKeterangan] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLookupLoading, setIsLookupLoading] = useState(false);

  // Tickets list & workflow states
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketStats, setTicketStats] = useState<any>({});
  const [ticketLoading, setTicketLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Physical Form Order Generator Modal State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [activeFormDoc, setActiveFormDoc] = useState<GeneratedFormDoc | null>(null);

  const getIndonesianDateString = (dateObj = new Date()) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const dayName = days[dateObj.getDay()];
    const day = dateObj.getDate();
    const monthName = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${dayName}, ${day} ${monthName} ${year}`;
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.lokasi-dropdown-container')) {
        setIsLokasiDropdownOpen(false);
      }
      if (!target.closest('.kelasbibit-dropdown-container')) {
        setIsKelasDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all locations for form dropdown
  useEffect(() => {
    async function loadLokasiOptions() {
      try {
        const res = await fetch('/api/sulam/lookup-lokasi');
        const json = await res.json();
        if (json.success && json.lokasiList) {
          setLokasiList(json.lokasiList);
        }
      } catch (err) {
        console.error('Error loading locations for form:', err);
      }
    }
    loadLokasiOptions();

    const handleSync = () => {
      loadLokasiOptions();
      fetchTickets();
    };
    window.addEventListener('sulam_updated', handleSync);
    window.addEventListener('master_data_updated', handleSync);
    return () => {
      window.removeEventListener('sulam_updated', handleSync);
      window.removeEventListener('master_data_updated', handleSync);
    };
  }, []);

  // Fetch ticket history
  const fetchTickets = async () => {
    try {
      setTicketLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/sulam/form-order?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTickets(json.data || []);
        if (json.stats) setTicketStats(json.stats);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setTicketLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [search, statusFilter]);

  // Handle location selection -> Auto lookup usia, spek, ritase, keterangan
  const handleLokasiChange = async (lok: string) => {
    setSelectedLokasi(lok);
    setLokasiSearch(lok);
    if (!lok) {
      setWilayah('');
      setUsiaDisplay('');
      setUsiaVal(null);
      setKelasBibit('Sucker No. 0');
      setRitCD('');
      setRitFuso('');
      setKeterangan('');
      return;
    }

    try {
      setIsLookupLoading(true);
      const res = await fetch(`/api/sulam/lookup-lokasi?lokasi=${encodeURIComponent(lok)}`);
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setWilayah(d.wilayah || '');
        setUsiaVal(d.usia !== undefined ? d.usia : null);
        setUsiaDisplay(d.usia !== null && d.usia !== undefined ? `${d.usia} Bulan` : '');
        if (d.kelasBibit && KELAS_BIBIT_OPTIONS.includes(d.kelasBibit)) {
          setKelasBibit(d.kelasBibit);
        }
        setRitCD(d.ritCD || '');
        setRitFuso(d.ritFuso || '');
        setKeterangan(d.keterangan || '');
      }
    } catch (err) {
      console.error('Lookup failed:', err);
    } finally {
      setIsLookupLoading(false);
    }
  };

  // Submit new ticket
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLokasi) {
      setFormMessage({ type: 'error', text: 'Pilih Lokasi terlebih dahulu!' });
      return;
    }

    try {
      setIsSubmitting(true);
      setFormMessage(null);

      const numRitFuso = Number(ritFuso) || 0;
      const numRitCD = Number(ritCD) || 0;

      const res = await fetch('/api/sulam/form-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lokasi: selectedLokasi,
          wilayah,
          usia: usiaVal,
          kelasBibit,
          ritFuso: numRitFuso,
          ritCD: numRitCD,
          keterangan,
          pemohonName: user?.name || user?.email || 'User Wilayah',
          pemohonRole: user?.role || 'user_wilayah',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setFormMessage({ type: 'success', text: json.message || 'Formulir order sulam berhasil diajukan!' });
        
        // Simpan referensi form doc untuk langsung preview jika user ingin mencetak
        setActiveFormDoc({
          lokasi: selectedLokasi,
          wilayah: wilayah || '',
          usiaDisplay: usiaDisplay || '',
          kelasBibit,
          ritCD: numRitCD,
          ritFuso: numRitFuso,
          keterangan,
          dateStr: getIndonesianDateString(new Date()),
        });

        // Reset form inputs
        setSelectedLokasi('');
        setLokasiSearch('');
        setWilayah('');
        setUsiaDisplay('');
        setUsiaVal(null);
        setKelasBibit('Sucker No. 0');
        setRitCD('');
        setRitFuso('');
        setKeterangan('');
        
        fetchTickets();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sulam_updated'));
        }
      } else {
        setFormMessage({ type: 'error', text: json.message || 'Gagal mengajukan formulir.' });
      }
    } catch (err) {
      setFormMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Workflow update (Approval by Planting or progress updates)
  const handleUpdateStatus = async (ticketId: number, nextStatus: string) => {
    try {
      setActionLoadingId(ticketId);
      const res = await fetch('/api/sulam/form-order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ticketId,
          status: nextStatus,
          approverName: user?.name || user?.email || 'User Planting',
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchTickets();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sulam_updated'));
        }
      } else {
        alert(json.message || 'Gagal mengubah status');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatKebutuhanRit = (cd: number | string, fuso: number | string) => {
    const numCD = Number(cd) || 0;
    const numFuso = Number(fuso) || 0;
    const parts: string[] = [];
    if (numCD > 0) parts.push(`${numCD} Rit CD`);
    if (numFuso > 0) parts.push(`${numFuso} Rit Fuso`);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DIAJUKAN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 font-bold text-[11px] border border-amber-300/60 dark:border-amber-700/50">
            <Clock className="w-3 h-3" /> Diajukan
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold text-[11px] border border-blue-300/60 dark:border-blue-700/50">
            <ShieldCheck className="w-3 h-3" /> Approved
          </span>
        );
      case 'ANTRIAN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-bold text-[11px] border border-purple-300/60 dark:border-purple-700/50">
            <Layers className="w-3 h-3" /> Masuk Antrian
          </span>
        );
      case 'REAL_DROP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] border border-indigo-300/60 dark:border-indigo-700/50">
            <Truck className="w-3 h-3" /> Real Drop
          </span>
        );
      case 'REAL_TANAM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-bold text-[11px] border border-teal-300/60 dark:border-teal-700/50">
            <CheckSquare className="w-3 h-3" /> Real Tanam
          </span>
        );
      case 'CLOSE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
            <CheckCircle2 className="w-3 h-3" /> Close
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const filteredLokasiList = lokasiList.filter(
    (item) =>
      item.lokasi.toLowerCase().includes(lokasiSearch.toLowerCase().trim()) ||
      (item.wilayah && item.wilayah.toLowerCase().includes(lokasiSearch.toLowerCase().trim()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Print CSS styling injection */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-form-order,
          #printable-form-order * {
            visibility: visible !important;
          }
          #printable-form-order {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Formulir Order Sulam Bibit
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Pengajuan kebutuhan bibit sulam resmi PG1 dan pembuatan dokumen cetak fisik F/NS/PLT/PL.06
            </p>
          </div>
        </div>

        {/* Role badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
          <User className="w-3.5 h-3.5" />
          <span>Peran: {isAdmin ? 'Administrator' : isUserPlanting ? 'User Planting (Approver)' : 'User Wilayah (Pemohon)'}</span>
        </div>
      </div>

      {/* Workflow Step Explanation */}
      <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Siklus Kerja Order Sulam:</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-[11px] font-semibold">
          <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="text-slate-400 block text-[9px] uppercase">Langkah 1</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">1. Order Diajukan</span>
          </div>
          <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="text-slate-400 block text-[9px] uppercase">Langkah 2</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">2. Approved Planting</span>
          </div>
          <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="text-slate-400 block text-[9px] uppercase">Langkah 3</span>
            <span className="text-purple-600 dark:text-purple-400 font-bold">3. Masuk Antrian</span>
          </div>
          <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="text-slate-400 block text-[9px] uppercase">Langkah 4</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">4. Real Drop</span>
          </div>
          <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="text-slate-400 block text-[9px] uppercase">Langkah 5</span>
            <span className="text-teal-600 dark:text-teal-400 font-bold">5. Real Tanam</span>
          </div>
          <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="text-slate-400 block text-[9px] uppercase">Langkah 6</span>
            <span className="text-slate-600 dark:text-slate-400 font-bold">6. Tiket Close</span>
          </div>
        </div>
      </div>

      {/* 1. BAGIAN FORM INPUT (DI POSISI ATAS) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>Input Form Order Sulam (User Wilayah)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Isi data pengajuan bibit sulam di bawah ini dan cetak formulir dokumen resmi F/NS/PLT/PL.06
            </p>
          </div>

          {isLookupLoading && (
            <span className="text-xs text-emerald-600 flex items-center gap-1.5 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 w-fit">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menarik data otomatis...
            </span>
          )}
        </div>

        {formMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
              formMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {formMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            )}
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>{formMessage.text}</span>
              {formMessage.type === 'success' && activeFormDoc && (
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-2xs cursor-pointer w-fit"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Lihat &amp; Cetak Form Order Fisik</span>
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Baris 1: Lokasi & Wilayah */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Lokasi (Searchable dropdown with rotating Chevron) */}
            <div className="relative lokasi-dropdown-container">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Lokasi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={isLokasiDropdownOpen ? lokasiSearch : (selectedLokasi || '')}
                  onChange={(e) => {
                    setLokasiSearch(e.target.value);
                    if (!isLokasiDropdownOpen) setIsLokasiDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setLokasiSearch(selectedLokasi || '');
                    setIsLokasiDropdownOpen(true);
                  }}
                  placeholder="Pilih Lokasi"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-xs"
                />
                <button
                  type="button"
                  onClick={() => setIsLokasiDropdownOpen(!isLokasiDropdownOpen)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  title="Pilih Lokasi"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isLokasiDropdownOpen ? 'rotate-180 text-emerald-600' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Dropdown Options List */}
              {isLokasiDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLokasiList.length === 0 ? (
                    <div className="p-3.5 text-center text-slate-400 text-xs">
                      Lokasi tidak ditemukan dalam sistem
                    </div>
                  ) : (
                    filteredLokasiList.map((item) => (
                      <button
                        key={item.lokasi}
                        type="button"
                        onClick={() => {
                          handleLokasiChange(item.lokasi);
                          setIsLokasiDropdownOpen(false);
                          setLokasiSearch(item.lokasi);
                        }}
                        className={`w-full px-3.5 py-2.5 text-left text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-between cursor-pointer transition-colors ${
                          selectedLokasi === item.lokasi
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="font-bold">{item.lokasi}</span>
                        {item.wilayah && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                            {item.wilayah}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 2. Wilayah (Default kosong, read only) */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Wilayah</label>
              <input
                type="text"
                value={wilayah}
                readOnly
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-not-allowed text-xs"
              />
            </div>
          </div>

          {/* Baris 2: Usia (Umur Forcing) & Kelas Bibit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 3. Usia (Umur Forcing) - Default kosong, read only */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Usia (Umur Forcing)
              </label>
              <input
                type="text"
                value={usiaDisplay}
                readOnly
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-not-allowed text-xs"
              />
            </div>

            {/* 4. Kelas Bibit (Dropdown 14 Opsi dengan Chevron berputar yang sejajar) */}
            <div className="relative kelasbibit-dropdown-container">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Kelas Bibit <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsKelasDropdownOpen(!isKelasDropdownOpen)}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-left cursor-pointer flex items-center justify-between"
                >
                  <span className={kelasBibit ? 'text-slate-900 dark:text-slate-100 font-bold' : 'text-slate-400'}>
                    {kelasBibit || 'Pilih Kelas Bibit'}
                  </span>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isKelasDropdownOpen ? 'rotate-180 text-emerald-600' : ''
                      }`}
                    />
                  </span>
                </button>
              </div>

              {/* Dropdown Options List */}
              {isKelasDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800">
                  {KELAS_BIBIT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setKelasBibit(opt);
                        setIsKelasDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 text-left text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-between cursor-pointer transition-colors ${
                        kelasBibit === opt
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{opt}</span>
                      {kelasBibit === opt && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Baris 3: Rit CD & Rit Fuso (Tanpa Spinner Panah Angka) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Rit CD
              </label>
              <input
                type="number"
                min="0"
                value={ritCD}
                onChange={(e) => {
                  const val = e.target.value;
                  setRitCD(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0));
                }}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Rit Fuso
              </label>
              <input
                type="number"
                min="0"
                value={ritFuso}
                onChange={(e) => {
                  const val = e.target.value;
                  setRitFuso(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0));
                }}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Baris 4: Keterangan (Default kosong) */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Keterangan
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder=""
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          {/* Action Buttons: Preview Form Order & Submit */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
            {/* Tombol Generate & Preview Form Fisik */}
            <button
              type="button"
              onClick={() => {
                if (!selectedLokasi) {
                  setFormMessage({ type: 'error', text: 'Silakan pilih Lokasi terlebih dahulu untuk melihat Form Order.' });
                  return;
                }
                setActiveFormDoc({
                  lokasi: selectedLokasi,
                  wilayah: wilayah || '',
                  usiaDisplay: usiaDisplay || '',
                  kelasBibit: kelasBibit || 'Sucker No. 0',
                  ritCD: Number(ritCD) || 0,
                  ritFuso: Number(ritFuso) || 0,
                  keterangan: keterangan || '',
                  dateStr: getIndonesianDateString(new Date()),
                });
                setIsPreviewModalOpen(true);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold transition-all shadow-xs cursor-pointer text-xs"
            >
              <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Generate Form Fisik (Preview &amp; Cetak)</span>
            </button>

            {/* Tombol Ajukan Order Sulam */}
            <button
              type="submit"
              disabled={isSubmitting || !selectedLokasi}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer text-xs"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mengirim Formulir...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Ajukan Order Sulam</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. BAGIAN DAFTAR PENGAJUAN & APPROVAL TIKET (DI POSISI BAWAH) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-600" />
              <span>Daftar Pengajuan &amp; Approval Tiket</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Persetujuan User Planting dan pelacakan progres realisasi tiket order sulam
            </p>
          </div>

          {/* Filter Status Quick Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold py-1">
            {['ALL', 'DIAJUKAN', 'APPROVED', 'ANTRIAN', 'REAL_DROP', 'REAL_TANAM', 'CLOSE'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {st === 'ALL' ? 'Semua' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Ticket Items List */}
        <div className="space-y-3">
          {ticketLoading ? (
            <div className="py-20 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
              <p className="text-xs font-semibold">Memuat riwayat tiket...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <Info className="w-8 h-8 mx-auto opacity-30 mb-2" />
              <p className="text-xs font-semibold">Belum ada pengajuan tiket order sulam.</p>
            </div>
          ) : (
            tickets.map((t) => (
              <div
                key={t.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-200">
                      {t.nomorTiket}
                    </span>
                    {getStatusBadge(t.status)}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {/* Tombol Cetak Form Fisik F/NS/PLT/PL.06 dari tiket */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFormDoc({
                          lokasi: t.lokasi,
                          wilayah: t.wilayah || '',
                          usiaDisplay: t.usia !== null && t.usia !== undefined ? `${t.usia} Bulan` : '',
                          kelasBibit: t.kelasBibit || 'Sucker No. 0',
                          ritCD: t.ritCD || 0,
                          ritFuso: t.ritFuso || 0,
                          keterangan: t.keterangan || '',
                          dateStr: getIndonesianDateString(new Date(t.createdAt)),
                        });
                        setIsPreviewModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-colors cursor-pointer"
                      title="Lihat & Cetak Dokumen Form F/NS/PLT/PL.06"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Form Cetak</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Petak &amp; Wilayah</span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {t.lokasi} <span className="font-semibold text-slate-500">({t.wilayah || '-'})</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Usia Tanaman</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400">
                      {t.usia !== null && t.usia !== undefined ? `${t.usia} Bulan` : '-'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Kelas Bibit</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {t.kelasBibit}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Kebutuhan Bibit</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {formatKebutuhanRit(t.ritCD, t.ritFuso)}
                    </span>
                  </div>
                </div>

                {t.keterangan && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Keterangan:</span> {t.keterangan}
                  </p>
                )}

                {/* Actions for User Planting / Admin */}
                {(isAdmin || isUserPlanting) && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400">
                      {t.approvedByName && (
                        <span>Diapprove oleh: <strong className="text-slate-600 dark:text-slate-300">{t.approvedByName}</strong></span>
                      )}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {t.status === 'DIAJUKAN' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(t.id, 'APPROVED')}
                          disabled={actionLoadingId === t.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Setujui (Approve)</span>
                        </button>
                      )}

                      {t.status === 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(t.id, 'ANTRIAN')}
                          disabled={actionLoadingId === t.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Masukkan Antrian</span>
                        </button>
                      )}

                      {t.status === 'ANTRIAN' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(t.id, 'REAL_DROP')}
                          disabled={actionLoadingId === t.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Real Drop Bibit</span>
                        </button>
                      )}

                      {t.status === 'REAL_DROP' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(t.id, 'REAL_TANAM')}
                          disabled={actionLoadingId === t.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Mulai Real Tanam</span>
                        </button>
                      )}

                      {t.status === 'REAL_TANAM' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(t.id, 'CLOSE')}
                          disabled={actionLoadingId === t.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Tutup Tiket (Close)</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. MODAL PREVIEW & CETAK DOKUMEN FISIK FORM ORDER BIBIT UNTUK SULAM (F/NS/PLT/PL.06) */}
      {isPreviewModalOpen && activeFormDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-auto overflow-hidden border border-slate-200">
            {/* Modal Top Actions (No Print) */}
            <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-100 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Pratinjau Dokumen Cetak Form Order Bibit Sulam (F/NS/PLT/PL.06)
                </h3>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  title="Tutup Pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Sheet (Printable Target) */}
            <div className="p-6 sm:p-10 bg-white text-black overflow-x-auto">
              <div id="printable-form-order" className="min-w-[760px] mx-auto bg-white text-black font-sans leading-tight">
                {/* Header Bagian Atas: Logo & Perusahaan (Kiri), Judul (Tengah), No. Dokumen (Kanan) */}
                <div className="border-2 border-black grid grid-cols-12 items-center">
                  {/* Kiri: Logo GGP & Perusahaan */}
                  <div className="col-span-4 p-2.5 flex items-center gap-2.5 border-r-2 border-black h-full">
                    <img
                      src="/assets/logo.png"
                      alt="Logo Great Giant Pineapple"
                      className="w-12 h-12 object-contain shrink-0"
                    />
                    <div>
                      <div className="text-[12px] font-black uppercase tracking-tight leading-tight">
                        PT. GREAT GIANT PINEAPPLE
                      </div>
                      <div className="text-[10px] font-semibold text-slate-800 leading-tight">
                        Plantation Group Dept
                      </div>
                    </div>
                  </div>

                  {/* Tengah: Judul Dokumen */}
                  <div className="col-span-5 p-2.5 text-center border-r-2 border-black h-full flex items-center justify-center">
                    <h2 className="text-[13px] sm:text-[14px] font-black tracking-wider uppercase text-black">
                      FORM ORDER BIBIT UNTUK SULAM
                    </h2>
                  </div>

                  {/* Kanan: Kotak Dokumen Info */}
                  <div className="col-span-3 text-[9.5px] h-full flex flex-col justify-center divide-y divide-black">
                    <div className="flex px-2 py-0.5">
                      <span className="w-20 font-bold">No. Dokumen</span>
                      <span className="font-mono font-bold">: F/NS/PLT/PL.06</span>
                    </div>
                    <div className="flex px-2 py-0.5">
                      <span className="w-20 font-bold">Rev</span>
                      <span className="font-mono">: 0</span>
                    </div>
                    <div className="flex px-2 py-0.5">
                      <span className="w-20 font-bold">Page</span>
                      <span className="font-mono">: 1 of 1</span>
                    </div>
                    <div className="flex px-2 py-0.5">
                      <span className="w-20 font-bold">Date Issue</span>
                      <span className="font-mono">: </span>
                    </div>
                  </div>
                </div>

                {/* Tabel 9 Kolom dengan 10 Baris Sesuai Form Fisik */}
                <table className="w-full border-collapse border-2 border-black border-t-0 text-[11px] text-black">
                  <thead>
                    <tr className="bg-slate-100 text-center font-bold border-b-2 border-black">
                      <th className="border border-black px-1.5 py-2 w-9">No</th>
                      <th className="border border-black px-2 py-2 w-14">Wilayah</th>
                      <th className="border border-black px-2 py-2 w-16">Lokasi</th>
                      <th className="border border-black px-2 py-2 w-16">Plot</th>
                      <th className="border border-black px-2 py-2 w-20">Luas Sulam</th>
                      <th className="border border-black px-2 py-2 w-32">Kelas Bibit</th>
                      <th className="border border-black px-2 py-2 w-36">Kebutuhan Bibit (rit)</th>
                      <th className="border border-black px-2 py-2 w-28">Umur Tanaman</th>
                      <th className="border border-black px-3 py-2">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 10 }).map((_, idx) => {
                      const rowNo = idx + 1;
                      const isFilled = idx === 0;

                      return (
                        <tr key={`form-row-${rowNo}`} className="h-8 border-b border-black">
                          {/* 1. No */}
                          <td className="border border-black text-center font-bold px-1">{rowNo}</td>

                          {/* 2. Wilayah */}
                          <td className="border border-black text-center font-semibold px-1">
                            {isFilled ? activeFormDoc.wilayah || '' : ''}
                          </td>

                          {/* 3. Lokasi */}
                          <td className="border border-black text-center font-black px-1">
                            {isFilled ? activeFormDoc.lokasi || '' : ''}
                          </td>

                          {/* 4. Plot (Dikosongkan sesuai permintaan) */}
                          <td className="border border-black text-center px-1"></td>

                          {/* 5. Luas Sulam (Dikosongkan sesuai permintaan) */}
                          <td className="border border-black text-center px-1"></td>

                          {/* 6. Kelas Bibit */}
                          <td className="border border-black text-center font-medium px-1">
                            {isFilled ? activeFormDoc.kelasBibit || '' : ''}
                          </td>

                          {/* 7. Kebutuhan Bibit (rit) */}
                          <td className="border border-black text-center font-bold px-1">
                            {isFilled
                              ? formatKebutuhanRit(activeFormDoc.ritCD, activeFormDoc.ritFuso)
                              : ''}
                          </td>

                          {/* 8. Umur Tanaman (dari Usia Umur Forcing) */}
                          <td className="border border-black text-center px-1">
                            {isFilled ? activeFormDoc.usiaDisplay || '' : ''}
                          </td>

                          {/* 9. Keterangan */}
                          <td className="border border-black text-left px-2 text-[10.5px]">
                            {isFilled ? activeFormDoc.keterangan || '' : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Tanggal & Tempat Pembuatan */}
                <div className="mt-5 text-right text-[11px] font-medium pr-4">
                  <span>Terbanggi Besar, {activeFormDoc.dateStr}</span>
                </div>

                {/* 4 Kolom Tanda Tangan */}
                <div className="grid grid-cols-4 gap-6 mt-6 text-center text-[11px]">
                  {/* Kolom 1: Kasbun Wil */}
                  <div className="flex flex-col items-center">
                    <span className="font-medium text-slate-800">Diajukan,</span>
                    <div className="h-16 w-full flex items-center justify-center">
                      {/* Ruang tanda tangan */}
                    </div>
                    <div className="border-b border-black w-32 sm:w-36 mb-1"></div>
                    <span className="font-bold text-slate-900">Kasbun Wil</span>
                  </div>

                  {/* Kolom 2: Ka Div Wil */}
                  <div className="flex flex-col items-center">
                    <span className="font-medium text-slate-800">Disetujui,</span>
                    <div className="h-16 w-full flex items-center justify-center">
                      {/* Ruang tanda tangan */}
                    </div>
                    <div className="border-b border-black w-32 sm:w-36 mb-1"></div>
                    <span className="font-bold text-slate-900">Ka Div Wil</span>
                  </div>

                  {/* Kolom 3: Ka Bag Planting PG */}
                  <div className="flex flex-col items-center">
                    <span className="font-medium text-slate-800">Disetujui,</span>
                    <div className="h-16 w-full flex items-center justify-center">
                      {/* Ruang tanda tangan */}
                    </div>
                    <div className="border-b border-black w-32 sm:w-36 mb-1"></div>
                    <span className="font-bold text-slate-900">Ka Bag Planting PG</span>
                  </div>

                  {/* Kolom 4: Manager PM */}
                  <div className="flex flex-col items-center">
                    <span className="font-medium text-slate-800">Diketahui,</span>
                    <div className="h-16 w-full flex items-center justify-center">
                      {/* Ruang tanda tangan */}
                    </div>
                    <div className="border-b border-black w-32 sm:w-36 mb-1"></div>
                    <span className="font-bold text-slate-900">Manager PM</span>
                  </div>
                </div>

                {/* CATATAN KAKI (FOOTNOTE) TELAH DIHAPUS / DITIADAKAN SESUAI PERMINTAAN USER */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
