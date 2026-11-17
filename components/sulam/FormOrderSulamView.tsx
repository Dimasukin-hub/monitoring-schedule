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
  Filter,
  RefreshCw,
  AlertCircle,
  Sparkles,
  User,
  ShieldCheck,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function FormOrderSulamView() {
  const { user, isAdmin, isUserPlanting, isUserWilayah } = useAuth();

  // Form states
  const [lokasiList, setLokasiList] = useState<{ lokasi: string; wilayah: string | null }[]>([]);
  const [selectedLokasi, setSelectedLokasi] = useState('');
  const [wilayah, setWilayah] = useState('');
  const [usiaDisplay, setUsiaDisplay] = useState('-');
  const [usiaVal, setUsiaVal] = useState<number | null>(null);
  const [kelasBibit, setKelasBibit] = useState('Sucker No. 2');
  const [ritCD, setRitCD] = useState<number>(0);
  const [ritFuso, setRitFuso] = useState<number>(0);
  const [keterangan, setKeterangan] = useState('Pangkas Produksi');
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
    if (!lok) {
      setWilayah('');
      setUsiaDisplay('-');
      setUsiaVal(null);
      setKelasBibit('Sucker No. 2');
      setRitCD(0);
      setRitFuso(0);
      setKeterangan('Pangkas Produksi');
      return;
    }

    try {
      setIsLookupLoading(true);
      const res = await fetch(`/api/sulam/lookup-lokasi?lokasi=${encodeURIComponent(lok)}`);
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setWilayah(d.wilayah || '');
        setUsiaVal(d.usia);
        setUsiaDisplay(d.usiaDisplay || (d.usia !== null ? `${d.usia} Bulan` : '-'));
        setKelasBibit(d.kelasBibit || 'Sucker No. 2');
        setRitCD(d.ritCD || 1);
        setRitFuso(d.ritFuso || 0);
        setKeterangan(d.keterangan || 'Pangkas Produksi');
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
      setFormMessage({ type: 'error', text: 'Pilih lokasi petak terlebih dahulu!' });
      return;
    }

    try {
      setIsSubmitting(true);
      setFormMessage(null);

      const res = await fetch('/api/sulam/form-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lokasi: selectedLokasi,
          wilayah,
          usia: usiaVal,
          kelasBibit,
          ritFuso,
          ritCD,
          keterangan,
          pemohonName: user?.name || user?.email || 'User Wilayah',
          pemohonRole: user?.role || 'user_wilayah',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setFormMessage({ type: 'success', text: json.message });
        // Reset form
        setSelectedLokasi('');
        setWilayah('');
        setUsiaDisplay('-');
        setUsiaVal(null);
        setRitCD(0);
        setRitFuso(0);
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
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
              Alur pengajuan permintaan sulam oleh User Wilayah dan persetujuan (approval) oleh User Planting
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

      {/* Main Grid: Form Input (Left) & Ticket Management (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Card (5 cols on large screens) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs h-fit space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Input Order Baru (User Wilayah)</span>
            </h2>
            {isLookupLoading && (
              <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                <RefreshCw className="w-3 h-3 animate-spin" /> Menarik data...
              </span>
            )}
          </div>

          {formMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                formMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {formMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{formMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* 1. Lokasi Dropdown */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lokasi Petak <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedLokasi}
                onChange={(e) => handleLokasiChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">-- Pilih Lokasi Petak --</option>
                {lokasiList.map((item) => (
                  <option key={item.lokasi} value={item.lokasi}>
                    {item.lokasi} {item.wilayah ? `(${item.wilayah})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Daftar lokasi otomatis mengikuti Master Status Lokasi &amp; List Sulam
              </p>
            </div>

            {/* 2. Wilayah & Usia (Otomatis dari perhitungan Tanggal Forcing Max) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Wilayah</label>
                <input
                  type="text"
                  value={wilayah || '-'}
                  readOnly
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Usia (Umur Forcing)</span>
                  <span className="text-[10px] font-normal text-teal-600 dark:text-teal-400">(Otomatis)</span>
                </label>
                <input
                  type="text"
                  value={usiaDisplay}
                  readOnly
                  className="w-full px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 font-bold cursor-not-allowed"
                />
              </div>
            </div>

            {/* 3. Kelas Bibit (Gabungan Jenis Bibit & Kelas Bibit) */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kelas Bibit (Jenis &amp; Kelas) <span className="text-rose-500">*</span>
              </label>
              <select
                value={kelasBibit}
                onChange={(e) => setKelasBibit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Sucker No. 0">Sucker No. 0</option>
                <option value="Sucker No. 1">Sucker No. 1</option>
                <option value="Sucker No. 2">Sucker No. 2</option>
                <option value="Sucker No. 3">Sucker No. 3</option>
                <option value="Sucker No. 4">Sucker No. 4</option>
                <option value="Crown No. 0">Crown No. 0</option>
                <option value="Crown No. 1">Crown No. 1</option>
                <option value="Crown No. 2">Crown No. 2</option>
                <option value="Crown No. 3">Crown No. 3</option>
                <option value="No. 0 Pangkas 60cm">No. 0 Pangkas 60cm</option>
                <option value="No. 1 Pangkas Prod">No. 1 Pangkas Prod</option>
                <option value="No. 2 Pangkas Prod">No. 2 Pangkas Prod</option>
                <option value="No. 3 Pangkas Prod">No. 3 Pangkas Prod</option>
                <option value="No. 2 / 3 Crown">No. 2 / 3 Crown</option>
              </select>
            </div>

            {/* 4. Ritase: Rit CD & Rit Fuso */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rit CD</label>
                <input
                  type="number"
                  min="0"
                  value={ritCD}
                  onChange={(e) => setRitCD(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rit Fuso</label>
                <input
                  type="number"
                  min="0"
                  value={ritFuso}
                  onChange={(e) => setRitFuso(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* 5. Keterangan */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Keterangan</label>
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Pangkas Produksi / Pangkas Samping"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !selectedLokasi}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
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

        {/* Tickets Approval & Progress Tracking Board (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <span>Daftar Pengajuan &amp; Approval Tiket</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Persetujuan User Planting dan pelacakan progres tiket order sulam
              </p>
            </div>

            {/* Filter Status Quick Pills */}
            <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-bold">
              {['ALL', 'DIAJUKAN', 'APPROVED', 'ANTRIAN', 'REAL_DROP', 'REAL_TANAM', 'CLOSE'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
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
              <div className="py-20 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
                <p className="text-xs font-semibold">Memuat riwayat tiket...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <Info className="w-8 h-8 mx-auto opacity-30 mb-2" />
                <p className="text-xs font-semibold">Belum ada pengajuan tiket order sulam.</p>
              </div>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-200">
                        {t.nomorTiket}
                      </span>
                      {getStatusBadge(t.status)}
                    </div>

                    <span className="text-[11px] font-semibold text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Petak &amp; Wilayah</span>
                      <span className="font-black text-slate-900 dark:text-white">
                        {t.lokasi} <span className="font-semibold text-slate-500">({t.wilayah || '-'})</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Usia Tanaman</span>
                      <span className="font-bold text-teal-600 dark:text-teal-400">
                        {t.usia !== null ? `${t.usia} Bulan` : '-'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Kelas Bibit</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                        {t.kelasBibit}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Ritase</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {t.ritCD} CD / {t.ritFuso} Fuso
                      </span>
                    </div>
                  </div>

                  {t.keterangan && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                      <span className="font-bold">Keterangan:</span> {t.keterangan}
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
      </div>
    </div>
  );
}

