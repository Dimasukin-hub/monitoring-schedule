'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sprout,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  MapPin,
  Search,
  Check,
  ChevronDown,
  Loader2,
  Trash2,
  RotateCcw,
  XCircle,
} from 'lucide-react';

interface QuickUpdateTanamLog {
  id: string;
  landId: number;
  lokasi: string;
  wilayah: string;
  activityKey: 'prosesTanam' | 'selesaiTanam';
  activityName: string;
  jenisBibit?: string | null;
  kelasBibit?: string | null;
  type: 'real' | 'rencana';
  date: string | null;
  volumeSummary?: string | null;
  createdDetailId?: number | null;
  timestamp: string;
}

// Helper conversions for HTML5 date input (YYYY-MM-DD) <-> App storage (DD/MM/YYYY)
function toDateInputValue(dStr: string | null | undefined): string {
  if (!dStr || dStr.trim() === '' || dStr === '-') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
  const parts = dStr.split('/');
  if (parts.length === 3) {
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    let y = parts[2];
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m}-${d}`;
  }
  return '';
}

function toDatabaseDate(dStr: string | null | undefined): string | null {
  if (!dStr || dStr.trim() === '' || dStr === '-') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
    const [y, m, d] = dStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return dStr;
}

function formatDisplayDate(dStr: string | null | undefined): string {
  if (!dStr || dStr.trim() === '' || dStr === '-') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
    const [y, m, d] = dStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return dStr;
}

interface QuickUpdateTanamViewProps {
  onDataChanged?: () => void;
  isAdmin?: boolean;
}

const JENIS_BIBIT_OPTIONS = ['Crown', 'Sucker', 'Nanas', 'MD2', 'GP3'];
const KELAS_BIBIT_OPTIONS = ['Besar', 'Sedang', 'Kecil', 'Extra Kecil'];

export default function QuickUpdateTanamView({ onDataChanged, isAdmin = true }: QuickUpdateTanamViewProps) {
  const [lands, setLands] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028]);
  const [availableWilayahs, setAvailableWilayahs] = useState<string[]>(['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07']);

  // Filters for selector
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [selectedWilayah, setSelectedWilayah] = useState<string>('');
  const [searchPetak, setSearchPetak] = useState<string>('');

  // Selected petak
  const [selectedLandId, setSelectedLandId] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form Fields
  const [selectedStage, setSelectedStage] = useState<'prosesTanam' | 'selesaiTanam' | null>(null);
  const [selectedJenisBibit, setSelectedJenisBibit] = useState<string>('');
  const [selectedKelasBibit, setSelectedKelasBibit] = useState<string>('');
  const [realDateInput, setRealDateInput] = useState<string>('');
  const [rencanaDateInput, setRencanaDateInput] = useState<string>('');

  // Volume Tanam per Kelas Bibit (Ha)
  const [volStandar, setVolStandar] = useState<string>('');
  const [volBesar, setVolBesar] = useState<string>('');
  const [volSedang, setVolSedang] = useState<string>('');
  const [volKecil, setVolKecil] = useState<string>('');
  const [volExtraKecil, setVolExtraKecil] = useState<string>('');

  const totalVolumeTanam = useMemo(() => {
    const s = parseFloat(volStandar) || 0;
    const b = parseFloat(volBesar) || 0;
    const sd = parseFloat(volSedang) || 0;
    const k = parseFloat(volKecil) || 0;
    const ek = parseFloat(volExtraKecil) || 0;
    return Math.round((s + b + sd + k + ek) * 100) / 100;
  }, [volStandar, volBesar, volSedang, volKecil, volExtraKecil]);

  const realDateInputRef = useRef<HTMLInputElement>(null);
  const rencanaDateInputRef = useRef<HTMLInputElement>(null);

  // UI States
  const [loadingLands, setLoadingLands] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Session Log stored in localStorage
  const [logs, setLogs] = useState<QuickUpdateTanamLog[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('labita_quick_update_tanam_logs');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading tanam logs from localStorage:', e);
      }
    }
    return [];
  });

  const saveLogs = (newLogs: QuickUpdateTanamLog[]) => {
    setLogs(newLogs);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('labita_quick_update_tanam_logs', JSON.stringify(newLogs.slice(0, 50)));
      } catch (e) {
        console.error('Error saving tanam logs to localStorage:', e);
      }
    }
  };

  // Close petak dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch lands for selector
  const fetchLands = async () => {
    setLoadingLands(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', String(selectedYear));
      if (selectedWilayah) params.append('wilayah', selectedWilayah);
      const res = await fetch(`/api/quick-update?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLands(json.data);
        if (json.filters?.years) setAvailableYears(json.filters.years);
        if (json.filters?.wilayahs) setAvailableWilayahs(json.filters.wilayahs);
      }
    } catch (err) {
      console.error('Error fetching lands in QuickUpdateTanamView:', err);
    } finally {
      setLoadingLands(false);
    }
  };

  useEffect(() => {
    fetchLands();
  }, [selectedYear, selectedWilayah]);

  // Current selected land object
  const currentLand = useMemo(() => {
    return lands.find((l) => l.id === selectedLandId) || null;
  }, [lands, selectedLandId]);

  // Sync inputs when petak or stage changes
  useEffect(() => {
    if (!currentLand) {
      setRealDateInput('');
      setRencanaDateInput('');
      setSelectedJenisBibit('');
      setSelectedKelasBibit('');
      setVolStandar('');
      setVolBesar('');
      setVolSedang('');
      setVolKecil('');
      setVolExtraKecil('');
      return;
    }

    // Set bibit defaults from petak (or empty if not yet assigned)
    setSelectedJenisBibit(currentLand.jenisBibit || '');
    setSelectedKelasBibit(currentLand.kelasBibit || '');

    // Set dates based on selected stage
    if (selectedStage === 'prosesTanam') {
      setRealDateInput(toDateInputValue(currentLand.realMulaiTanam));
      setRencanaDateInput(toDateInputValue(currentLand.rencMulaiTanam));
    } else if (selectedStage === 'selesaiTanam') {
      setRealDateInput(toDateInputValue(currentLand.realSelesaiTanam));
      setRencanaDateInput(toDateInputValue(currentLand.rencSelesaiTanam));
    } else {
      setRealDateInput('');
      setRencanaDateInput('');
    }
  }, [currentLand, selectedStage]);

  // Filtered lands for autocomplete
  const filteredLands = useMemo(() => {
    if (!searchPetak.trim()) return lands;
    const q = searchPetak.toLowerCase().trim();
    return lands.filter(
      (l) =>
        l.lokasi?.toLowerCase().includes(q) ||
        l.wilayah?.toLowerCase().includes(q) ||
        l.status?.toLowerCase().includes(q) ||
        l.category?.toLowerCase().includes(q)
    );
  }, [lands, searchPetak]);

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLandId) {
      setFeedback({ type: 'error', message: 'Silakan pilih lokasi terlebih dahulu' });
      return;
    }
    if (!selectedStage) {
      setFeedback({ type: 'error', message: 'Silakan pilih aktivitas terlebih dahulu' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const formattedRealDate = toDatabaseDate(realDateInput);
      const formattedRencanaDate = toDatabaseDate(rencanaDateInput);

      const payload = {
        landId: selectedLandId,
        activityKey: selectedStage,
        realDate: formattedRealDate,
        rencanaDate: formattedRencanaDate,
        type: formattedRealDate ? 'real' : 'rencana',
        date: formattedRealDate || formattedRencanaDate,
        jenisBibit: selectedJenisBibit || null,
        kelasBibit: selectedKelasBibit || null,
        volumeStandar: volStandar ? parseFloat(volStandar) : 0,
        volumeBesar: volBesar ? parseFloat(volBesar) : 0,
        volumeSedang: volSedang ? parseFloat(volSedang) : 0,
        volumeKecil: volKecil ? parseFloat(volKecil) : 0,
        volumeExtraKecil: volExtraKecil ? parseFloat(volExtraKecil) : 0,
        totalVolume: totalVolumeTanam,
        note: null,
      };

      const res = await fetch('/api/quick-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan pembaruan tanam');
      }

      const stageName = selectedStage === 'prosesTanam' ? 'Mulai / Proses Tanam' : 'Selesai Tanam';

      setFeedback({
        type: 'success',
        message: json.message || `Berhasil memperbarui ${stageName} untuk petak ${currentLand?.lokasi}`,
      });

      // Add to session log
      const dateParts: string[] = [];
      if (formattedRealDate) dateParts.push(`Real: ${formattedRealDate}`);
      if (formattedRencanaDate) dateParts.push(`Rencana: ${formattedRencanaDate}`);
      const dateSummary = dateParts.length > 0 ? dateParts.join(' • ') : '(Dikosongkan)';

      const newLog: QuickUpdateTanamLog = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        landId: selectedLandId,
        lokasi: currentLand?.lokasi || '',
        wilayah: currentLand?.wilayah || '',
        activityKey: selectedStage,
        activityName: stageName,
        jenisBibit: selectedJenisBibit || null,
        kelasBibit: selectedKelasBibit || null,
        type: formattedRealDate ? 'real' : 'rencana',
        date: dateSummary,
        volumeSummary: totalVolumeTanam > 0 ? `${totalVolumeTanam.toFixed(2)} Ha` : null,
        createdDetailId: json.data?.createdDetailId || null,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      saveLogs([newLog, ...logs]);

      // Re-fetch lands to refresh context
      await fetchLands();

      // Trigger global dashboard refresh (KpiCards, Charts, Tanam, ListStokLahan)
      onDataChanged?.();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Terjadi kesalahan sistem' });
    } finally {
      setSubmitting(false);
    }
  };

  // Undo / Revert log action
  const handleUndoLog = async (logItem: QuickUpdateTanamLog) => {
    if (!confirm(`Batalkan pembaruan ${logItem.activityName} pada petak ${logItem.lokasi}?`)) return;

    try {
      const res = await fetch('/api/quick-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landId: logItem.landId,
          activityKey: logItem.activityKey,
          realDate: null,
          rencanaDate: null,
          date: null,
          deleteDetailId: logItem.createdDetailId || null,
          isUndo: true,
        }),
      });
      const json = await res.json();
      if (json.success) {
        saveLogs(logs.filter((l) => l.id !== logItem.id));
        await fetchLands();
        onDataChanged?.();
        setFeedback({
          type: 'success',
          message: `Berhasil membatalkan tanggal ${logItem.activityName} untuk petak ${logItem.lokasi}`,
        });
      }
    } catch (err: any) {
      alert(`Gagal membatalkan: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Main Grid: Form di Kiri (7 Kolom) vs Riwayat di Kanan (5 Kolom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PANEL KIRI: FORM ENTRI */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 glass-panel shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Form Update
            </span>
          </div>

          {feedback && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <span className="font-medium">{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="hover:opacity-70 text-slate-500 text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* TAHUN */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Tahun
              </label>
              <div className="relative">
                <select
                  value={selectedYear}
                  onFocus={() => setOpenSelect('year')}
                  onBlur={() => setOpenSelect(null)}
                  onChange={(e) => {
                    setSelectedYear(e.target.value ? parseInt(e.target.value, 10) : '');
                    setSelectedLandId(null);
                    setSearchPetak('');
                    setOpenSelect(null);
                    (e.target as HTMLElement).blur();
                  }}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 pr-10 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer shadow-xs"
                >
                  <option value="" disabled hidden className="hidden"></option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-auto">
                  {selectedYear !== '' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedYear('');
                        setSelectedLandId(null);
                        setSearchPetak('');
                      }}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                      title="Kosongkan Tahun"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  ) : (
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 pointer-events-none transition-transform duration-200 ${
                        openSelect === 'year' ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : 'rotate-0'
                      }`}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* WILAYAH */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Wilayah
              </label>
              <div className="relative">
                <select
                  value={selectedWilayah}
                  onFocus={() => setOpenSelect('wilayah')}
                  onBlur={() => setOpenSelect(null)}
                  onChange={(e) => {
                    setSelectedWilayah(e.target.value);
                    setSelectedLandId(null);
                    setSearchPetak('');
                    setOpenSelect(null);
                    (e.target as HTMLElement).blur();
                  }}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 pr-10 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer shadow-xs"
                >
                  <option value="" disabled hidden className="hidden"></option>
                  {availableWilayahs.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-auto">
                  {selectedWilayah !== '' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWilayah('');
                        setSelectedLandId(null);
                        setSearchPetak('');
                      }}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                      title="Kosongkan Wilayah"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  ) : (
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 pointer-events-none transition-transform duration-200 ${
                        openSelect === 'wilayah' ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : 'rotate-0'
                      }`}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* LOKASI (PETAK) DROPDOWN DENGAN KOTAK PENCARIAN DI DALAMNYA */}
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Lokasi
              </label>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari lokasi"
                  value={searchPetak}
                  onChange={(e) => {
                    setSearchPetak(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-8 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
                />
                {searchPetak && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchPetak('');
                      setSelectedLandId(null);
                      setIsDropdownOpen(true);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                    title="Hapus pencarian"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown Suggestions Popover */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 no-scrollbar animate-in fade-in zoom-in-98 duration-150">
                  {filteredLands.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic">
                      Lokasi &quot;{searchPetak}&quot; tidak ditemukan di wilayah {selectedWilayah}
                    </div>
                  ) : (
                    filteredLands.map((l) => {
                      const isSelected = l.id === selectedLandId;
                      return (
                        <div
                          key={l.id}
                          onClick={() => {
                            setSelectedLandId(l.id);
                            setSearchPetak(l.lokasi);
                            setIsDropdownOpen(false);
                          }}
                          className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-950 dark:text-emerald-200 font-semibold'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                              {l.lokasi}
                            </span>
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {l.wilayah} • Netto: <strong>{Number(l.luasNetto || 0).toFixed(2)} Ha</strong>
                            </span>
                            {l.status && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                                {l.status}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {l.category && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                l.category === 'SN'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                                  : l.category === 'PROSES'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                                  : l.category === 'SELESAI'
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}>
                                {l.category}
                              </span>
                            )}
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Live Context Card Preview (Saat lokasi terpilih) */}
              {currentLand && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/30 dark:border-emerald-500/20 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white font-mono">
                        {currentLand.lokasi}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Wilayah {currentLand.wilayah} • Netto: {Number(currentLand.luasNetto || 0).toFixed(2)} Ha
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      Kategori: {currentLand.category || '-'} ({currentLand.computedLastAct || '-'})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200/40 dark:border-emerald-800/40 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Status Tanam:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {currentLand.realSelesaiTanam
                          ? 'Selesai Tanam (100%)'
                          : currentLand.realMulaiTanam
                          ? 'Proses Tanam (50%)'
                          : 'Siap Tanam / Belum'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Bibit Terdaftar:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {currentLand.jenisBibit ? `${currentLand.jenisBibit} (${currentLand.kelasBibit || '-'})` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Tanggal SN:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {currentLand.bulanSn || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PILIHAN AKTIVITAS TANAM */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Aktivitas
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedStage(selectedStage === 'prosesTanam' ? null : 'prosesTanam')}
                  className={`py-2.5 px-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    selectedStage === 'prosesTanam'
                      ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Mulai / Proses Tanam
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                      50%
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStage(selectedStage === 'selesaiTanam' ? null : 'selesaiTanam')}
                  className={`py-2.5 px-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    selectedStage === 'selesaiTanam'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Selesai Tanam
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                      100%
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* IDENTITAS BIBIT (JENIS & KELAS - TANPA PILIHAN PLACEHOLDER) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Jenis Bibit
                </label>
                <div className="relative">
                  <select
                    value={selectedJenisBibit}
                    onFocus={() => setOpenSelect('jenis')}
                    onBlur={() => setOpenSelect(null)}
                    onChange={(e) => {
                      setSelectedJenisBibit(e.target.value);
                      setOpenSelect(null);
                      (e.target as HTMLElement).blur();
                    }}
                    className="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 pr-10 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer shadow-xs"
                  >
                    <option value="" disabled hidden className="hidden"></option>
                    {JENIS_BIBIT_OPTIONS.map((jb) => (
                      <option key={jb} value={jb}>
                        {jb}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-auto">
                    {selectedJenisBibit !== '' ? (
                      <button
                        type="button"
                        onClick={() => setSelectedJenisBibit('')}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                        title="Kosongkan Jenis Bibit"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 pointer-events-none transition-transform duration-200 ${
                          openSelect === 'jenis' ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : 'rotate-0'
                        }`}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Kelas Bibit
                </label>
                <div className="relative">
                  <select
                    value={selectedKelasBibit}
                    onFocus={() => setOpenSelect('kelas')}
                    onBlur={() => setOpenSelect(null)}
                    onChange={(e) => {
                      setSelectedKelasBibit(e.target.value);
                      setOpenSelect(null);
                      (e.target as HTMLElement).blur();
                    }}
                    className="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 pr-10 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer shadow-xs"
                  >
                    <option value="" disabled hidden className="hidden"></option>
                    {KELAS_BIBIT_OPTIONS.map((kb) => (
                      <option key={kb} value={kb}>
                        {kb}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-auto">
                    {selectedKelasBibit !== '' ? (
                      <button
                        type="button"
                        onClick={() => setSelectedKelasBibit('')}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                        title="Kosongkan Kelas Bibit"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 pointer-events-none transition-transform duration-200 ${
                          openSelect === 'kelas' ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : 'rotate-0'
                        }`}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* KOTAK INPUT TANGGAL (REAL & RENCANA - TANPA TULISAN DD/MM/YYYY) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Tanggal
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* Kotak Real */}
                <div
                  onClick={() => {
                    try {
                      realDateInputRef.current?.showPicker?.();
                    } catch {
                      realDateInputRef.current?.focus();
                    }
                  }}
                  className={`relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer shadow-xs select-none group ${
                    realDateInput
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-600 ring-1 ring-emerald-500/30'
                      : 'bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                      Real
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5 min-h-[1rem] inline-block">
                      {formatDisplayDate(realDateInput) || ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 group-hover:scale-105 transition-transform">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>

                  <input
                    ref={realDateInputRef}
                    type="date"
                    value={realDateInput}
                    onChange={(e) => setRealDateInput(e.target.value)}
                    className="opacity-0 pointer-events-none absolute bottom-0 left-0 w-px h-px overflow-hidden"
                    tabIndex={-1}
                  />
                </div>

                {/* Kotak Rencana */}
                <div
                  onClick={() => {
                    try {
                      rencanaDateInputRef.current?.showPicker?.();
                    } catch {
                      rencanaDateInputRef.current?.focus();
                    }
                  }}
                  className={`relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer shadow-xs select-none group ${
                    rencanaDateInput
                      ? 'bg-sky-50/50 dark:bg-sky-950/30 border-sky-500 dark:border-sky-600 ring-1 ring-sky-500/30'
                      : 'bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300">
                      Rencana
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5 min-h-[1rem] inline-block">
                      {formatDisplayDate(rencanaDateInput) || ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 group-hover:scale-105 transition-transform">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>

                  <input
                    ref={rencanaDateInputRef}
                    type="date"
                    value={rencanaDateInput}
                    onChange={(e) => setRencanaDateInput(e.target.value)}
                    className="opacity-0 pointer-events-none absolute bottom-0 left-0 w-px h-px overflow-hidden"
                    tabIndex={-1}
                  />
                </div>
              </div>
            </div>

            {/* INPUT VOLUME TANAM PER KELAS BIBIT */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sprout className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Volume Tanam (Ha)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  {currentLand && Number(currentLand.luasNetto || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetClass = selectedKelasBibit || 'Kecil';
                        const nettoVal = String(Number(currentLand.luasNetto).toFixed(2));
                        setVolStandar('');
                        setVolBesar(targetClass === 'Besar' ? nettoVal : '');
                        setVolSedang(targetClass === 'Sedang' ? nettoVal : '');
                        setVolKecil(targetClass === 'Kecil' ? nettoVal : '');
                        setVolExtraKecil(targetClass === 'Extra Kecil' ? nettoVal : '');
                      }}
                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      title="Isi otomatis luas netto penuh ke kelas bibit terpilih"
                    >
                      Isi Penuh ({Number(currentLand.luasNetto).toFixed(2)} Ha)
                    </button>
                  )}
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-md font-mono ${
                      totalVolumeTanam > 0
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    Total: {totalVolumeTanam.toFixed(2)} Ha
                  </span>
                </div>
              </div>

              {/* Grid 5 Kolom: Standar, Besar, Sedang, Kecil, Extra Kecil */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                {/* Standar */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                    Standar
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={volStandar}
                    onChange={(e) => setVolStandar(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                {/* Besar */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                    Besar
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={volBesar}
                    onChange={(e) => setVolBesar(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                {/* Sedang */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                    Sedang
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={volSedang}
                    onChange={(e) => setVolSedang(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                {/* Kecil */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                    Kecil
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={volKecil}
                    onChange={(e) => setVolKecil(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                {/* Extra Kecil */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                    Extra Kecil
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={volExtraKecil}
                    onChange={(e) => setVolExtraKecil(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* TOMBOL SIMPAN */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !selectedLandId}
                className={`w-full py-3 px-4 rounded-2xl font-bold text-xs tracking-wide text-white transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                  submitting || !selectedLandId
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-500/20 active:scale-[0.99]'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Simpan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* PANEL KANAN: RIWAYAT UPDATE (HISTORY) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 glass-panel shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  History
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  {logs.length}
                </span>
              </div>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Hapus semua catatan history sesi ini?')) saveLogs([]);
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Hapus
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-slate-400">Belum ada pembaruan tanam pada sesi ini</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 text-xs flex items-center justify-between gap-3 group transition-all"
                  >
                    <div className="space-y-1 flex-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {log.lokasi}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                          {log.wilayah}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                          {log.activityName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                        <span>{log.date}</span>
                        {log.jenisBibit && (
                          <>
                            <span className="text-slate-400">•</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {log.jenisBibit} {log.kelasBibit ? `(${log.kelasBibit})` : ''}
                            </span>
                          </>
                        )}
                        {log.volumeSummary && (
                          <>
                            <span className="text-slate-400">•</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-mono">
                              {log.volumeSummary}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">{log.timestamp}</div>
                    </div>

                    <button
                      type="button"
                      title="Batalkan perubahan ini"
                      onClick={() => handleUndoLog(log)}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:border-rose-300 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
