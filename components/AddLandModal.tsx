'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Check,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  XCircle,
} from 'lucide-react';
import { REAL_MASTER_STATUSES } from '@/components/LandTable';

export interface MasterCycle {
  year: number;
  bruto: number;
  netto: number;
  sts: string;
  rawSts: string;
  wil: string;
}

interface AddLandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableWilayahs?: string[];
  availableStatuses?: string[];
  availableBulanTanams?: string[];
}

const DEFAULT_WILAYAHS = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07'];

const BULAN_TANAM_OPTIONS = [
  'Jan-26', 'Feb-26', 'Mar-26', 'Apr-26', 'Mei-26', 'Jun-26',
  'Jul-26', 'Agu-26', 'Sep-26', 'Okt-26', 'Nov-26', 'Des-26',
  'Jan-27', 'Feb-27', 'Mar-27', 'Apr-27', 'Mei-27', 'Jun-27',
  'Jul-27', 'Agu-27', 'Sep-27', 'Okt-27', 'Nov-27', 'Des-27',
];

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function parseDateStr(str: string | null | undefined): { year: number; month: number; day: number } | null {
  if (!str || str === '-' || str === '0' || str.trim() === '') return null;
  const s = str.trim();
  const slashParts = s.split('/');
  if (slashParts.length === 3) {
    const d = parseInt(slashParts[0], 10);
    const m = parseInt(slashParts[1], 10) - 1;
    let y = parseInt(slashParts[2], 10);
    if (y < 100) y += 2000;
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 0 && m <= 11) {
      return { day: d, month: m, year: y };
    }
  }
  const dashParts = s.split('-');
  if (dashParts.length === 3) {
    const y = parseInt(dashParts[0], 10);
    const m = parseInt(dashParts[1], 10) - 1;
    const d = parseInt(dashParts[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 0 && m <= 11) {
      return { day: d, month: m, year: y };
    }
  }
  return null;
}

// In-memory cache for master data lookup
let cachedMasterLookup: Record<string, MasterCycle[]> | null = null;

export default function AddLandModal({
  isOpen,
  onClose,
  onSuccess,
  availableWilayahs = DEFAULT_WILAYAHS,
  availableStatuses = REAL_MASTER_STATUSES,
  availableBulanTanams = BULAN_TANAM_OPTIONS,
}: AddLandModalProps) {
  const [masterLookup, setMasterLookup] = useState<Record<string, MasterCycle[]>>(
    cachedMasterLookup || {}
  );
  const [loadingMaster, setLoadingMaster] = useState(!cachedMasterLookup);

  // Form states - Start completely empty
  const [lokasi, setLokasi] = useState('');
  const [selectedCycleYear, setSelectedCycleYear] = useState<number | null>(null);
  const [luasBruto, setLuasBruto] = useState<string>('');
  const [luasNetto, setLuasNetto] = useState<string>('');
  const [wilayah, setWilayah] = useState('');
  const [status, setStatus] = useState('');
  const [bulanTanam, setBulanTanam] = useState('');
  const [rencBkrDate, setRencBkrDate] = useState<string>(''); // Formatted DD/MM/YYYY
  const [bulanTanamYearTab, setBulanTanamYearTab] = useState<'2026' | '2027'>('2026');

  // Dropdown open states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isWilayahOpen, setIsWilayahOpen] = useState(false);
  const [isBulanTanamOpen, setIsBulanTanamOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Floating portal coordinates
  const [bulanTanamCoords, setBulanTanamCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const [wilayahCoords, setWilayahCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const [dateCoords, setDateCoords] = useState<{ top: number; left: number } | null>(null);

  // Calendar popover state
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(2026);
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth());
  const [manualDateInput, setManualDateInput] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const lokasiInputRef = useRef<HTMLInputElement>(null);
  const dateTriggerRef = useRef<HTMLDivElement>(null);
  const datePopoverRef = useRef<HTMLDivElement>(null);
  const wilayahTriggerRef = useRef<HTMLDivElement>(null);
  const wilayahDropdownRef = useRef<HTMLDivElement>(null);
  const bulanTanamTriggerRef = useRef<HTMLDivElement>(null);
  const bulanTanamDropdownRef = useRef<HTMLDivElement>(null);

  // Global Clear: clears all columns automatically when any XCircle is clicked
  const clearAllFields = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setLokasi('');
    setSelectedCycleYear(null);
    setLuasBruto('');
    setLuasNetto('');
    setWilayah('');
    setStatus('');
    setBulanTanam('');
    setRencBkrDate('');
    setIsDropdownOpen(false);
    setIsWilayahOpen(false);
    setIsBulanTanamOpen(false);
    setIsDatePickerOpen(false);
    setErrorMessage(null);
    lokasiInputRef.current?.focus();
  };

  // Position calculation for Bulan Tanam dropdown (floating portal)
  const updateBulanTanamPosition = () => {
    if (!bulanTanamTriggerRef.current) return;
    const rect = bulanTanamTriggerRef.current.getBoundingClientRect();
    const popoverWidth = Math.max(rect.width, 310);
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 12) left = 12;

    const top = rect.bottom + 6;
    setBulanTanamCoords({ top, left, width: popoverWidth });
  };

  // Position calculation for Wilayah dropdown (floating portal)
  const updateWilayahPosition = () => {
    if (!wilayahTriggerRef.current) return;
    const rect = wilayahTriggerRef.current.getBoundingClientRect();
    const popoverWidth = Math.max(rect.width, 240);
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 12) left = 12;

    const top = rect.bottom + 6;
    setWilayahCoords({ top, left, width: popoverWidth });
  };

  // Position calculation for DatePicker popover (floating portal)
  const updateDatePosition = () => {
    if (!dateTriggerRef.current) return;
    const rect = dateTriggerRef.current.getBoundingClientRect();
    const popoverWidth = 260;
    const popoverHeight = 310;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 12) left = 12;

    let top = rect.bottom + 6;
    if (top + popoverHeight > window.innerHeight - 12 && rect.top > popoverHeight + 12) {
      top = rect.top - popoverHeight - 6;
    }

    setDateCoords({ top, left });
  };

  // Sync positions when open
  useEffect(() => {
    if (isBulanTanamOpen) updateBulanTanamPosition();
  }, [isBulanTanamOpen]);

  useEffect(() => {
    if (isWilayahOpen) updateWilayahPosition();
  }, [isWilayahOpen]);

  useEffect(() => {
    if (isDatePickerOpen) {
      updateDatePosition();
      const p = parseDateStr(rencBkrDate);
      if (p) {
        setViewYear(p.year);
        setViewMonth(p.month);
        setManualDateInput(rencBkrDate);
      } else {
        setViewYear(2026);
        setViewMonth(today.getMonth());
        setManualDateInput('');
      }
    }
  }, [isDatePickerOpen, rencBkrDate]);

  // Close custom floating dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wilayahTriggerRef.current &&
        !wilayahTriggerRef.current.contains(target) &&
        wilayahDropdownRef.current &&
        !wilayahDropdownRef.current.contains(target)
      ) {
        setIsWilayahOpen(false);
      }
      if (
        bulanTanamTriggerRef.current &&
        !bulanTanamTriggerRef.current.contains(target) &&
        bulanTanamDropdownRef.current &&
        !bulanTanamDropdownRef.current.contains(target)
      ) {
        setIsBulanTanamOpen(false);
      }
      if (
        dateTriggerRef.current &&
        !dateTriggerRef.current.contains(target) &&
        datePopoverRef.current &&
        !datePopoverRef.current.contains(target)
      ) {
        setIsDatePickerOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      if (isBulanTanamOpen) updateBulanTanamPosition();
      if (isWilayahOpen) updateWilayahPosition();
      if (isDatePickerOpen) updateDatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isBulanTanamOpen, isWilayahOpen, isDatePickerOpen]);

  // Load master lookup data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!cachedMasterLookup) {
        setLoadingMaster(true);
        fetch('/api/lands/master-lookup')
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.data) {
              cachedMasterLookup = data.data;
              setMasterLookup(data.data);
            }
          })
          .catch((err) => console.error('Failed to load master lookup:', err))
          .finally(() => setLoadingMaster(false));
      } else {
        setMasterLookup(cachedMasterLookup);
      }

      // Reset form completely
      clearAllFields();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Autocomplete matching locations with each distinct cycle option
  interface LocationOption {
    locKey: string;
    cycle: MasterCycle;
    cycleCount: number;
  }

  const matchingLocationOptions = useMemo<LocationOption[]>(() => {
    const q = lokasi.trim().toUpperCase();
    if (!q) return [];
    const results: LocationOption[] = [];
    const allKeys = Object.keys(masterLookup);

    for (const k of allKeys) {
      if (k.toUpperCase().includes(q)) {
        const cycles = masterLookup[k] || [];
        for (const c of cycles) {
          results.push({
            locKey: k,
            cycle: c,
            cycleCount: cycles.length,
          });
        }
      }
    }

    // Sort: exact matches first, then starts-with, then descending by year
    results.sort((a, b) => {
      if (a.locKey === q && b.locKey !== q) return -1;
      if (b.locKey === q && a.locKey !== q) return 1;
      if (a.locKey.startsWith(q) && !b.locKey.startsWith(q)) return -1;
      if (b.locKey.startsWith(q) && !a.locKey.startsWith(q)) return 1;
      if (a.locKey === b.locKey) return b.cycle.year - a.cycle.year;
      return a.locKey.localeCompare(b.locKey);
    });

    return results.slice(0, 15);
  }, [lokasi, masterLookup]);

  // Select and immediately confirm a chosen cycle option
  const handleSelectCycle = (locKey: string, cycle: MasterCycle) => {
    setLokasi(locKey);
    setSelectedCycleYear(cycle.year);
    setLuasBruto(cycle.bruto > 0 ? String(cycle.bruto) : '');
    setLuasNetto(cycle.netto > 0 ? String(cycle.netto) : '');
    if (cycle.wil) setWilayah(cycle.wil);
    if (cycle.sts) setStatus(cycle.sts);
    setIsDropdownOpen(false);
  };

  // Handle manual typing in lokasi input
  const handleLokasiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setLokasi(val);
    setIsDropdownOpen(true);
    setSelectedCycleYear(null);
  };

  // Calendar helpers
  const parsedDate = parseDateStr(rencBkrDate);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (dayNum: number) => {
    const dd = String(dayNum).padStart(2, '0');
    const mm = String(viewMonth + 1).padStart(2, '0');
    setRencBkrDate(`${dd}/${mm}/${viewYear}`);
    setIsDatePickerOpen(false);
  };

  const handleSetToday = () => {
    const t = new Date();
    const dd = String(t.getDate()).padStart(2, '0');
    const mm = String(t.getMonth() + 1).padStart(2, '0');
    setRencBkrDate(`${dd}/${mm}/${t.getFullYear()}`);
    setIsDatePickerOpen(false);
  };

  const handleClearDate = () => {
    setRencBkrDate('');
    setIsDatePickerOpen(false);
  };

  const handleApplyManualDate = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!manualDateInput.trim()) {
      handleClearDate();
      return;
    }
    const p = parseDateStr(manualDateInput);
    if (p) {
      const dd = String(p.day).padStart(2, '0');
      const mm = String(p.month + 1).padStart(2, '0');
      setRencBkrDate(`${dd}/${mm}/${p.year}`);
      setIsDatePickerOpen(false);
    } else {
      alert('Format tanggal tidak valid. Gunakan format DD/MM/YYYY (contoh: 15/10/2026)');
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanLokasi = lokasi.trim().toUpperCase();
    if (!cleanLokasi) {
      setErrorMessage('Nama lokasi / petak wajib diisi.');
      return;
    }

    const brutoNum = parseFloat(luasBruto);
    const nettoNum = parseFloat(luasNetto);

    if (isNaN(brutoNum) || brutoNum <= 0) {
      setErrorMessage('Luas bruto harus berupa angka valid lebih dari 0.');
      return;
    }

    if (isNaN(nettoNum) || nettoNum <= 0) {
      setErrorMessage('Luas netto harus berupa angka valid lebih dari 0.');
      return;
    }

    if (!bulanTanam) {
      setErrorMessage('Bulan tanam wajib dipilih.');
      return;
    }

    setIsSubmitting(true);
    try {
      const rencBkrFormatted = rencBkrDate && rencBkrDate.trim() !== '' && rencBkrDate.trim() !== '-' ? rencBkrDate.trim() : null;
      const cleanWilayah = wilayah ? wilayah.trim() : 'W01';

      const res = await fetch('/api/lands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lokasi: cleanLokasi,
          wilayah: cleanWilayah,
          luasBruto: brutoNum,
          luasNetto: nettoNum,
          status: status ? status.trim() : 'NSBK',
          bulanTanam,
          rencBkr: rencBkrFormatted,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Gagal menambahkan data lahan');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error submitting land:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        ref={modalRef}
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-transparent dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
              L
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Tambah Data Lahan
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Bersih tanpa scrollbar karena popover dirender via portal */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 rounded-b-2xl">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Row 1: Lokasi with Autocomplete showing each cycle option */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Lokasi <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={lokasiInputRef}
                type="text"
                required
                placeholder="Cari lokasi"
                value={lokasi}
                onChange={handleLokasiChange}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:normal-case placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase transition-all h-[38px]"
              />
              {lokasi ? (
                <button
                  type="button"
                  onClick={clearAllFields}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                  title="Hapus semua isian"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              ) : (
                <div className="absolute right-3 top-2.5 text-slate-400 pointer-events-none">
                  <Search className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Autocomplete Dropdown - Menampilkan tiap opsi siklus & klik langsung confirm */}
            {isDropdownOpen && matchingLocationOptions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-56 overflow-y-auto p-1 divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {matchingLocationOptions.map(({ locKey, cycle }, idx) => {
                  return (
                    <button
                      key={`${locKey}-${cycle.year}-${idx}`}
                      type="button"
                      onClick={() => handleSelectCycle(locKey, cycle)}
                      className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 dark:hover:bg-slate-800/80 rounded-lg flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                          {locKey}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                          Tahun {cycle.year}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({cycle.wil})
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
                        <span>Bruto: {cycle.bruto} Ha</span>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span>Netto: {cycle.netto} Ha</span>
                        {cycle.sts && (
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({cycle.sts})
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Konfirmasi Pilihan Master Data (jika ada siklus yang terkonfirmasi) */}
          {selectedCycleYear && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-100">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                <span>
                  Terkonfirmasi: <strong>{lokasi}</strong> (Master {selectedCycleYear} — Bruto {luasBruto} Ha / Netto {luasNetto} Ha)
                </span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Siklus Terpilih
              </span>
            </div>
          )}

          {/* Row 2: Luas Bruto & Luas Netto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center justify-between">
                <span>Luas Bruto (Ha) <span className="text-rose-500">*</span></span>
                {selectedCycleYear && (
                  <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                    Master {selectedCycleYear}
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={luasBruto}
                onChange={(e) => setLuasBruto(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 h-[38px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center justify-between">
                <span>Luas Netto (Ha) <span className="text-rose-500">*</span></span>
                {selectedCycleYear && (
                  <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                    Master {selectedCycleYear}
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={luasNetto}
                onChange={(e) => setLuasNetto(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 h-[38px]"
              />
            </div>
          </div>

          {/* Row 3: Wilayah & STS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Custom Dropdown Wilayah - Drop ke bawah */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Wilayah
              </label>
              <div
                ref={wilayahTriggerRef}
                onClick={() => {
                  if (!isWilayahOpen) updateWilayahPosition();
                  setIsWilayahOpen((prev) => !prev);
                  setIsBulanTanamOpen(false);
                  setIsDatePickerOpen(false);
                }}
                className="relative flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 transition-colors h-[38px]"
              >
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 min-h-[1rem]">
                  {wilayah}
                </span>
                {wilayah ? (
                  <button
                    type="button"
                    onClick={clearAllFields}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer transition-colors p-0.5 -mr-0.5 rounded-full z-10"
                    title="Hapus semua isian"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                ) : (
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
                      isWilayahOpen ? 'rotate-180 text-emerald-500' : ''
                    }`}
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                STS
              </label>
              <input
                type="text"
                value={status}
                onChange={(e) => setStatus(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 h-[38px]"
              />
            </div>
          </div>

          {/* Row 4: Bulan Tanam & Rencana Tanggal Bongkar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Custom Dropdown Bulan Tanam */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Bulan Tanam <span className="text-rose-500">*</span>
              </label>
              <div
                ref={bulanTanamTriggerRef}
                onClick={() => {
                  if (!isBulanTanamOpen) updateBulanTanamPosition();
                  setIsBulanTanamOpen((prev) => !prev);
                  setIsWilayahOpen(false);
                  setIsDatePickerOpen(false);
                }}
                className="relative flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 transition-colors h-[38px]"
              >
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 min-h-[1rem]">
                  {bulanTanam}
                </span>
                {bulanTanam ? (
                  <button
                    type="button"
                    onClick={clearAllFields}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer transition-colors p-0.5 -mr-0.5 rounded-full z-10"
                    title="Hapus semua isian"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                ) : (
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
                      isBulanTanamOpen ? 'rotate-180 text-emerald-500' : ''
                    }`}
                  />
                )}
              </div>
            </div>

            {/* Rencana Tanggal Bongkar - DatePicker persis seperti Data Lahan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Rencana Tanggal Bongkar
              </label>
              <div
                ref={dateTriggerRef}
                onClick={() => {
                  setIsDatePickerOpen((prev) => !prev);
                  setIsWilayahOpen(false);
                  setIsBulanTanamOpen(false);
                }}
                className="relative flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 transition-colors h-[38px]"
              >
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 min-h-[1rem]">
                  {rencBkrDate}
                </span>
                {rencBkrDate ? (
                  <button
                    type="button"
                    onClick={clearAllFields}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer transition-colors p-0.5 -mr-0.5 rounded-full z-10"
                    title="Hapus semua isian"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                ) : (
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Floating Wilayah Dropdown via Portal - Muncul drop ke bawah, bebas scrollbar & tidak terpotong */}
      {isWilayahOpen &&
        wilayahCoords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={wilayahDropdownRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${wilayahCoords.top}px`,
              left: `${wilayahCoords.left}px`,
              width: `${wilayahCoords.width}px`,
              zIndex: 99999,
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-100 select-none ring-1 ring-black/5 dark:ring-white/10"
          >
            <div className="grid grid-cols-4 gap-1.5">
              {availableWilayahs.map((w) => {
                const isSel = wilayah === w;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setWilayah(w);
                      setIsWilayahOpen(false);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                      isSel
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}

      {/* Floating Bulan Tanam Dropdown via Portal - Muncul drop ke bawah, bebas scrollbar & tidak terpotong */}
      {isBulanTanamOpen &&
        bulanTanamCoords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={bulanTanamDropdownRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${bulanTanamCoords.top}px`,
              left: `${bulanTanamCoords.left}px`,
              width: `${bulanTanamCoords.width}px`,
              zIndex: 99999,
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-100 select-none ring-1 ring-black/5 dark:ring-white/10"
          >
            {/* Tab Selector Tahun */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setBulanTanamYearTab('2026')}
                className={`flex-1 py-1 text-center rounded-lg transition-all cursor-pointer ${
                  bulanTanamYearTab === '2026'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Tahun 2026
              </button>
              {availableBulanTanams.some((m) => m.endsWith('-27')) && (
                <button
                  type="button"
                  onClick={() => setBulanTanamYearTab('2027')}
                  className={`flex-1 py-1 text-center rounded-lg transition-all cursor-pointer ${
                    bulanTanamYearTab === '2027'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  Tahun 2027
                </button>
              )}
            </div>

            {/* Grid Bulan Menyamping (4 Kolom x 3 Baris) */}
            <div className="grid grid-cols-4 gap-1.5">
              {availableBulanTanams
                .filter((m) => m.endsWith(bulanTanamYearTab === '2026' ? '-26' : '-27'))
                .map((bt) => {
                  const isSel = bulanTanam === bt;
                  return (
                    <button
                      key={bt}
                      type="button"
                      onClick={() => {
                        setBulanTanam(bt);
                        setIsBulanTanamOpen(false);
                      }}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                        isSel
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {bt}
                    </button>
                  );
                })}
            </div>
          </div>,
          document.body
        )}

      {/* Floating Datepicker Popover Portal persis seperti Data Lahan (TableDatePicker) */}
      {isDatePickerOpen &&
        dateCoords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={datePopoverRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${dateCoords.top}px`,
              left: `${dateCoords.left}px`,
              zIndex: 99999,
            }}
            className="w-[260px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150 select-none text-slate-800 dark:text-slate-200 text-xs font-sans ring-1 ring-black/5 dark:ring-white/10"
          >
            {/* Header: Month / Year / Prev / Next */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                title="Bulan sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  {INDONESIAN_MONTHS[viewMonth]} {viewYear}
                </span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                title="Bulan berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Manual input row */}
            <form onSubmit={handleApplyManualDate} className="flex items-center gap-1 mb-2">
              <input
                type="text"
                placeholder="DD/MM/YYYY"
                value={manualDateInput}
                onChange={(e) => setManualDateInput(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
              >
                OK
              </button>
            </form>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {DAYS_SHORT.map((d, i) => (
                <span
                  key={d}
                  className={`text-[10px] font-bold py-0.5 ${
                    i === 0 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {d}
                </span>
              ))}

              {/* Blank cells for offset */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="w-7 h-7" />
              ))}

              {/* Days in Month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const isSelected =
                  parsedDate &&
                  parsedDate.year === viewYear &&
                  parsedDate.month === viewMonth &&
                  parsedDate.day === dayNum;

                const isTodayDate =
                  today.getFullYear() === viewYear &&
                  today.getMonth() === viewMonth &&
                  today.getDate() === dayNum;

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => handleSelectDay(dayNum)}
                    className={`w-7 h-7 text-xs font-mono font-medium rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : isTodayDate
                        ? 'ring-1 ring-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-slate-800'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={handleClearDate}
                className="font-medium text-rose-500 hover:underline cursor-pointer"
              >
                Kosongkan
              </button>

              <button
                type="button"
                onClick={handleSetToday}
                className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Hari Ini
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
