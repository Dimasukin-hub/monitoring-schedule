'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  MapPin,
  Tractor,
  Sprout,
  Sparkles,
  RotateCcw,
  Search,
  Check,
  ChevronDown,
  Info,
  Loader2,
  Trash2,
  ArrowRight,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

interface QuickUpdateLog {
  id: string;
  landId: number;
  lokasi: string;
  wilayah: string;
  activityKey: string;
  activityName: string;
  type: 'real' | 'rencana';
  date: string | null;
  timestamp: string;
  previousDate?: string | null;
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

interface QuickUpdateViewProps {
  onDataChanged?: () => void;
  isAdmin?: boolean;
}

export default function QuickUpdateView({ onDataChanged, isAdmin = true }: QuickUpdateViewProps) {
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form Fields
  const [activityCategory, setActivityCategory] = useState<'bongkar' | 'bajak' | 'siap_tanam' | null>(null);
  const [selectedActivityKey, setSelectedActivityKey] = useState<string>('');
  const [realDateInput, setRealDateInput] = useState<string>('');
  const [rencanaDateInput, setRencanaDateInput] = useState<string>('');

  const realDateInputRef = useRef<HTMLInputElement>(null);
  const rencanaDateInputRef = useRef<HTMLInputElement>(null);

  // Activity dropdown states (open downward, aligned chevrons)
  const [openActivityGroup, setOpenActivityGroup] = useState<'bongkar' | 'bajak' | 'siap_tanam' | null>(null);
  const activityDropdownRef = useRef<HTMLDivElement>(null);

  // UI States
  const [loadingLands, setLoadingLands] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Session Log stored in localStorage
  const [logs, setLogs] = useState<QuickUpdateLog[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('labita_quick_update_logs');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading logs from localStorage:', e);
      }
    }
    return [];
  });

  const saveLogs = (newLogs: QuickUpdateLog[]) => {
    setLogs(newLogs);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('labita_quick_update_logs', JSON.stringify(newLogs.slice(0, 30)));
      } catch (e) {
        console.error('Error saving logs to localStorage:', e);
      }
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (activityDropdownRef.current && !activityDropdownRef.current.contains(e.target as Node)) {
        setOpenActivityGroup(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch lands based on selected year & wilayah
  const fetchLands = async () => {
    setLoadingLands(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', String(selectedYear));
      if (selectedWilayah) params.append('wilayah', selectedWilayah);
      const res = await fetch(`/api/quick-update?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLands(json.data || []);
        if (json.filters?.years && Array.isArray(json.filters.years)) {
          const sorted = [...json.filters.years].sort((a, b) => a - b);
          setAvailableYears(sorted);
        }
        if (json.filters?.wilayahs) setAvailableWilayahs(json.filters.wilayahs);
      }
    } catch (err) {
      console.error('Error fetching lands for quick update:', err);
    } finally {
      setLoadingLands(false);
    }
  };

  useEffect(() => {
    fetchLands();
  }, [selectedYear, selectedWilayah]);

  // Selected land object
  const currentLand = useMemo(() => {
    return lands.find((l) => l.id === selectedLandId) || null;
  }, [lands, selectedLandId]);

  // Auto-fill existing date when land or activity changes
  useEffect(() => {
    if (!currentLand) {
      setRealDateInput('');
      setRencanaDateInput('');
      return;
    }
    const app = currentLand.aplikasiDetails || {};

    const realKeys: Record<string, string | null | undefined> = {
        chopper: app.realChopper || currentLand.realBkr,
        chopperLu: app.realChopperLu,
        rh1: app.realRh1,
        cuttingBanana: app.realCuttingBanana,
        dolomit: app.realDolomit,
        dp1: app.realDp1,
        dpCross: app.realDpCross,
        dp2: app.realDp2,
        belerang: app.realBelerang,
        kompos: app.realKompos,
        bajakAwalMb5Btr: app.realBajakAwalMb5Btr || currentLand.realBajak,
        bajakAwalMb25: app.realBajakAwalMb25,
        bajakAwalMph: app.realBajakAwalHoward,
        bajakAwalNardi: app.realBajakAwalNardi,
        hrEksMb: app.realHrEksMb,
        subsoilerSs1: app.realSubsoilerSs1,
        subsoilerSs2: app.realSubsoilerSs2,
        finishingRotaryFh1: app.realFinishingRotaryFh1,
        finishingRotaryFh2: app.realRotaryFh2,
        ridger: app.realRidger,
        jalanSal: app.realJalanSal,
        siapTanam: app.realSiapTanam || currentLand.bulanSn,
        prosesTanam: currentLand.realMulaiTanam || app.realMulaiTanam,
        selesaiTanam: currentLand.realSelesaiTanam || app.realSelesaiTanam,
    };

    const rencKeys: Record<string, string | null | undefined> = {
        chopper: app.chopper || currentLand.rencBkr,
        chopperLu: app.chopperLu,
        rh1: app.rh1,
        cuttingBanana: app.cuttingBanana,
        dolomit: app.dolomit,
        dp1: app.dp1,
        dpCross: app.dpCross,
        dp2: app.dp2,
        belerang: app.belerang,
        kompos: app.kompos,
        bajakAwalMb5Btr: app.rencAwalMb5Btr || app.bajakAwalMb5Btr || currentLand.rencBajak,
        bajakAwalMb25: app.bajakAwalMb25,
        bajakAwalMph: app.bajakAwalMph,
        bajakAwalNardi: app.bajakAwalNardi,
        hrEksMb: app.hrEksMb,
        subsoilerSs1: app.subsoilerSs1,
        subsoilerSs2: app.subsoilerSs2,
        finishingRotaryFh1: app.finishingRotaryFh1,
        finishingRotaryFh2: app.finishingRotaryFh2,
        ridger: app.ridger,
        jalanSal: app.jalanSal,
        siapTanam: app.siapTanam,
        prosesTanam: currentLand.rencMulaiTanam || app.rencMulaiTanam,
        selesaiTanam: currentLand.rencSelesaiTanam || app.rencSelesaiTanam,
    };

    setRealDateInput(toDateInputValue(realKeys[selectedActivityKey]));
    setRencanaDateInput(toDateInputValue(rencKeys[selectedActivityKey]));
  }, [currentLand, selectedActivityKey]);

  // Filtered lands for autocomplete
  const filteredLands = useMemo(() => {
    if (!searchPetak.trim()) return lands;
    const q = searchPetak.toLowerCase().trim();
    return lands.filter(
      (l) =>
        l.lokasi?.toLowerCase().includes(q) ||
        l.wilayah?.toLowerCase().includes(q) ||
        l.status?.toLowerCase().includes(q)
    );
  }, [lands, searchPetak]);

  // Activities definitions
  const ACTIVITY_GROUPS = [
    {
      id: 'bongkar' as const,
      title: 'Bongkar',
      badgeBorder: 'border-amber-500 dark:border-amber-500',
      badgeBg: 'bg-amber-50/50 dark:bg-amber-950/40',
      badgeText: 'text-amber-950 dark:text-amber-200',
      badgeRing: 'ring-amber-500/40',
      items: [
        { key: 'chopper', label: 'Chopper' },
        { key: 'chopperLu', label: 'Chopper LU' },
        { key: 'rh1', label: 'RH1' },
        { key: 'cuttingBanana', label: 'Cutting Banana' },
        { key: 'dolomit', label: 'Aplikasi Dolomit' },
        { key: 'dp1', label: 'DP 1' },
        { key: 'dpCross', label: 'DP Cross' },
        { key: 'dp2', label: 'DP 2' },
        { key: 'belerang', label: 'Aplikasi Belerang' },
        { key: 'kompos', label: 'Aplikasi Kompos' },
      ],
    },
    {
      id: 'bajak' as const,
      title: 'Bajak',
      badgeBorder: 'border-sky-500 dark:border-sky-500',
      badgeBg: 'bg-sky-50/50 dark:bg-sky-950/40',
      badgeText: 'text-sky-950 dark:text-sky-200',
      badgeRing: 'ring-sky-500/40',
      items: [
        { key: 'bajakAwalMb5Btr', label: 'MB 5 BTR' },
        { key: 'bajakAwalMb25', label: 'MB 2.5' },
        { key: 'bajakAwalMph', label: 'MPH' },
        { key: 'bajakAwalNardi', label: 'Nardi' },
        { key: 'hrEksMb', label: 'HR Eks MB' },
        { key: 'subsoilerSs1', label: 'Subsoiler SS1' },
        { key: 'subsoilerSs2', label: 'Subsoiler SS2' },
        { key: 'finishingRotaryFh1', label: 'Finishing Rotary FH1' },
        { key: 'finishingRotaryFh2', label: 'Finishing Rotary FH2' },
        { key: 'ridger', label: 'Ridger' },
      ],
    },
    {
      id: 'siap_tanam' as const,
      title: 'Siap Tanam',
      badgeBorder: 'border-lime-500 dark:border-lime-500',
      badgeBg: 'bg-lime-50/50 dark:bg-lime-950/40',
      badgeText: 'text-lime-950 dark:text-lime-200',
      badgeRing: 'ring-lime-500/40',
      items: [
        { key: 'jalanSal', label: 'Jalan & Saluran' },
        { key: 'siapTanam', label: 'Siap Tanam' },
      ],
    },
  ];

  const currentActivityGroup = useMemo(() => {
    return ACTIVITY_GROUPS.find((g) => g.id === activityCategory) || ACTIVITY_GROUPS[1];
  }, [activityCategory]);

  const currentActivityItem = useMemo(() => {
    if (!selectedActivityKey) return null;
    for (const g of ACTIVITY_GROUPS) {
      const it = g.items.find((i) => i.key === selectedActivityKey);
      if (it) return it;
    }
    return null;
  }, [selectedActivityKey]);

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLandId) {
      setFeedback({ type: 'error', message: 'Silakan pilih lokasi terlebih dahulu' });
      return;
    }
    if (!selectedActivityKey || !currentActivityItem) {
      setFeedback({ type: 'error', message: 'Silakan pilih jenis aktivitas yang ingin diperbarui' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const formattedRealDate = toDatabaseDate(realDateInput);
      const formattedRencanaDate = toDatabaseDate(rencanaDateInput);

      const payload = {
        landId: selectedLandId,
        activityKey: selectedActivityKey,
        realDate: formattedRealDate,
        rencanaDate: formattedRencanaDate,
        type: formattedRealDate ? 'real' : 'rencana',
        date: formattedRealDate || formattedRencanaDate,
        note: null,
      };

      const res = await fetch('/api/quick-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan pembaruan aktivitas');
      }

      setFeedback({
        type: 'success',
        message: json.message || `Berhasil memperbarui ${currentActivityItem.label} untuk lokasi ${currentLand?.lokasi}`,
      });

      // Add to session log
      const dateParts: string[] = [];
      if (formattedRealDate) dateParts.push(`Real: ${formattedRealDate}`);
      if (formattedRencanaDate) dateParts.push(`Rencana: ${formattedRencanaDate}`);
      const dateSummary = dateParts.length > 0 ? dateParts.join(' • ') : '(Dikosongkan)';

      const newLog: QuickUpdateLog = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        landId: selectedLandId,
        lokasi: currentLand?.lokasi || '',
        wilayah: currentLand?.wilayah || '',
        activityKey: selectedActivityKey,
        activityName: currentActivityItem.label,
        type: formattedRealDate ? 'real' : 'rencana',
        date: dateSummary,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      saveLogs([newLog, ...logs]);

      // Re-fetch lands to refresh context
      await fetchLands();

      // Trigger global dashboard refresh (KpiCards, Charts, ListStokLahan)
      onDataChanged?.();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Terjadi kesalahan sistem' });
    } finally {
      setSubmitting(false);
    }
  };

  // Undo / Revert log action
  const handleUndoLog = async (logItem: QuickUpdateLog) => {
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
        }),
      });
      const json = await res.json();
      if (json.success) {
        // Remove from logs
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

      {/* Main Grid: Form di Kiri (7 Kolom) vs Riwayat & Panduan di Kanan (5 Kolom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PANEL KIRI: FORM ENTRI */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 glass-panel shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
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
                  onChange={(e) => {
                    setSelectedYear(e.target.value ? parseInt(e.target.value, 10) : '');
                    setSelectedLandId(null);
                    setSearchPetak('');
                  }}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 pr-10 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer shadow-xs"
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
                    <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none" />
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
                  onChange={(e) => {
                    setSelectedWilayah(e.target.value);
                    setSelectedLandId(null);
                    setSearchPetak('');
                  }}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 pr-10 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer shadow-xs"
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
                    <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none" />
                  )}
                </div>
              </div>
            </div>

            {/* LOKASI */}
            <div className="space-y-2 relative" ref={dropdownRef}>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Lokasi
              </label>

              {/* Direct Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari lokasi"
                  value={searchPetak}
                  onChange={(e) => {
                    setSearchPetak(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-8 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs"
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
                              ? 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-950 dark:text-amber-200 font-semibold'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                              {l.lokasi}
                            </span>
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {l.wilayah} • Netto: <strong>{l.luasNetto} Ha</strong>
                            </span>
                            {l.status && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                                {l.status}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              {l.computedLastAct || l.category}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Live Context Card Preview (Saat lokasi terpilih) */}
              {currentLand && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-transparent border border-amber-500/30 dark:border-amber-500/20 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-mono">
                        {currentLand.lokasi}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Wilayah {currentLand.wilayah} • Netto: {currentLand.luasNetto} Ha
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      Kategori: {currentLand.category} ({currentLand.computedLastAct})
                    </span>
                  </div>

                  {/* Progress bar 3 tahapan pengolahan lahan */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className={`p-1.5 rounded-lg border ${
                      currentLand.realChopper
                        ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 text-amber-900 dark:text-amber-200 font-bold'
                        : 'bg-white/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-400'
                    }`}>
                      <span className="block truncate">Chopper</span>
                      <span className="font-mono text-[9px]">{currentLand.realChopper || '-'}</span>
                    </div>

                    <div className={`p-1.5 rounded-lg border ${
                      currentLand.realBajakMb5Btr
                        ? 'bg-sky-100 dark:bg-sky-950/60 border-sky-300 text-sky-900 dark:text-sky-200 font-bold'
                        : 'bg-white/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-400'
                    }`}>
                      <span className="block truncate">Bajak</span>
                      <span className="font-mono text-[9px]">{currentLand.realBajakMb5Btr || '-'}</span>
                    </div>

                    <div className={`p-1.5 rounded-lg border ${
                      currentLand.realSiapTanam
                        ? 'bg-lime-100 dark:bg-lime-950/60 border-lime-300 text-lime-900 dark:text-lime-200 font-bold'
                        : 'bg-white/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-400'
                    }`}>
                      <span className="block truncate">Siap Tanam</span>
                      <span className="font-mono text-[9px]">{currentLand.realSiapTanam || '-'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AKTIVITAS (4 DROPDOWNS BERTINGKAT) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Aktivitas
              </label>

              <div ref={activityDropdownRef} className="space-y-2">
                {ACTIVITY_GROUPS.map((group) => {
                  const isCurrentGroup = activityCategory === group.id;
                  const selectedInGroup = isCurrentGroup ? group.items.find((i) => i.key === selectedActivityKey) : null;
                  const isOpen = openActivityGroup === group.id;

                  return (
                    <div key={group.id} className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenActivityGroup((prev) => (prev === group.id ? null : group.id))}
                        className={`w-full relative flex items-center justify-between rounded-xl px-3.5 pr-10 py-2.5 text-xs font-semibold cursor-pointer shadow-xs transition-all text-left ${
                          selectedInGroup
                            ? `${group.badgeBorder} ${group.badgeBg} ${group.badgeText} font-bold ring-1 ${group.badgeRing}`
                            : 'bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate">
                          {selectedInGroup ? selectedInGroup.label : group.title}
                        </span>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-auto">
                          {selectedInGroup ? (
                            <span
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivityCategory(null);
                                setSelectedActivityKey('');
                                setRealDateInput('');
                                setRencanaDateInput('');
                              }}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                              title="Batalkan pilihan aktivitas"
                            >
                              <XCircle className="w-4 h-4" />
                            </span>
                          ) : (
                            <ChevronDown
                              className={`w-4 h-4 text-slate-400 transition-transform duration-200 pointer-events-none ${
                                isOpen ? 'rotate-180' : ''
                              }`}
                            />
                          )}
                        </div>
                      </button>

                      {/* Dropdown Menu - SELALU MUNCUL KE BAWAH */}
                      {isOpen && (
                        <div className="absolute top-full mt-1.5 left-0 right-0 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 max-h-56 overflow-y-auto no-scrollbar animate-in fade-in zoom-in-98 duration-150">
                          {group.items.map((act) => {
                            const isActSelected = isCurrentGroup && selectedActivityKey === act.key;
                            return (
                              <div
                                key={act.key}
                                onClick={() => {
                                  setActivityCategory(group.id);
                                  setSelectedActivityKey(act.key);
                                  setOpenActivityGroup(null);
                                }}
                                className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-between ${
                                  isActSelected
                                    ? 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-950 dark:text-amber-200 font-bold'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span>{act.label}</span>
                                {isActSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TANGGAL */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Tanggal
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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


            {/* TOMBOL SIMPAN */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !selectedLandId || !selectedActivityKey}
                className={`w-full py-3 px-4 rounded-2xl font-bold text-xs tracking-wide text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                  submitting || !selectedLandId || !selectedActivityKey
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 shadow-amber-500/20 active:scale-[0.99]'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>Simpan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* PANEL KANAN: RIWAYAT UPDATE */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 glass-panel shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  History
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                  {logs.length}
                </span>
              </div>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Hapus seluruh daftar riwayat sesi ini?')) saveLogs([]);
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-500 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Hapus riwayat lokal"
                >
                  <Trash2 className="w-3 h-3" />
                  Bersihkan
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-slate-400 dark:text-slate-500">
                <Clock className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs italic">Belum ada pembaruan aktivitas yang diinput pada sesi ini.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto no-scrollbar">
                {logs.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs">
                          {item.lokasi}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {item.wilayah} • {item.timestamp}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                          item.type === 'real'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                        }`}>
                          {item.type}
                        </span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 font-medium truncate">
                        {item.activityName}: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{item.date || '(Dikosongkan)'}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUndoLog(item)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                      title="Batalkan pembaruan ini (Kembalikan ke kosong)"
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
