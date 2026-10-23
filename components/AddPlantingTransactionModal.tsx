'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  XCircle,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';

interface AddPlantingTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lockedLokasi?: string | null;
}

const AKTIVITAS_OPTIONS = ['Tanam Bibit', 'Petik Bibit'];
const JENIS_BIBIT_OPTIONS = ['Crown', 'Sucker'];

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function parseDateInput(str: string | null | undefined): { year: number; month: number; day: number } | null {
  if (!str || str.trim() === '') return null;
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
  return null;
}

export default function AddPlantingTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  lockedLokasi = null,
}: AddPlantingTransactionModalProps) {
  const [tanggal, setTanggal] = useState('');
  const [lokasi, setLokasi] = useState(lockedLokasi || '');
  const [aktivitas, setAktivitas] = useState('');
  const [jenisBibit, setJenisBibit] = useState('');
  const [petikKe, setPetikKe] = useState('');

  // 5 Kelas Bibit (Default 0.00)
  const [standar, setStandar] = useState('0.00');
  const [besar, setBesar] = useState('0.00');
  const [sedang, setSedang] = useState('0.00');
  const [kecil, setKecil] = useState('0.00');
  const [extraKecil, setExtraKecil] = useState('0.00');

  // Lokasi options for dropdown
  const [locationsList, setLocationsList] = useState<string[]>([]);
  const [searchLoc, setSearchLoc] = useState('');
  const [isLocDropdownOpen, setIsLocDropdownOpen] = useState(false);
  const locRef = useRef<HTMLDivElement>(null);

  // Dropdowns state
  const [openDropdown, setOpenDropdown] = useState<'aktivitas' | 'jenis' | null>(null);
  const aktivitasRef = useRef<HTMLDivElement>(null);
  const jenisRef = useRef<HTMLDivElement>(null);

  // DatePicker state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const datePickerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync lockedLokasi when changed or opened
  useEffect(() => {
    if (lockedLokasi) {
      setLokasi(lockedLokasi);
    }
  }, [lockedLokasi, isOpen]);

  // Fetch available locations if not locked
  useEffect(() => {
    if (!lockedLokasi && isOpen) {
      fetch('/api/planting?limit=1000')
        .then((r) => r.json())
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            const locs = res.data.map((d: any) => d.lokasi).filter(Boolean);
            setLocationsList(locs);
          }
        })
        .catch((e) => console.error('Failed to load locations:', e));
    }
  }, [lockedLokasi, isOpen]);

  // Close popovers on click outside
  useEffect(() => {
    if (!isDatePickerOpen && !openDropdown && !isLocDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (isDatePickerOpen && datePickerRef.current && !datePickerRef.current.contains(target)) {
        setIsDatePickerOpen(false);
      }
      if (
        openDropdown === 'aktivitas' &&
        aktivitasRef.current &&
        !aktivitasRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
      if (
        openDropdown === 'jenis' &&
        jenisRef.current &&
        !jenisRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
      if (
        isLocDropdownOpen &&
        locRef.current &&
        !locRef.current.contains(target)
      ) {
        setIsLocDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDatePickerOpen, openDropdown, isLocDropdownOpen]);

  // Sync calendar view month when tanggal has value
  useEffect(() => {
    const parsed = parseDateInput(tanggal);
    if (parsed) {
      setCalMonth(parsed.month);
      setCalYear(parsed.year);
    }
  }, [tanggal]);

  // Hitung total luas secara live
  const calculatedTotal = useMemo(() => {
    const s = parseFloat(standar) || 0;
    const b = parseFloat(besar) || 0;
    const sd = parseFloat(sedang) || 0;
    const k = parseFloat(kecil) || 0;
    const ek = parseFloat(extraKecil) || 0;
    return Number((s + b + sd + k + ek).toFixed(2));
  }, [standar, besar, sedang, kecil, extraKecil]);

  const filteredLocations = useMemo(() => {
    if (!searchLoc) return locationsList;
    return locationsList.filter((l) => l.toLowerCase().includes(searchLoc.toLowerCase()));
  }, [locationsList, searchLoc]);

  if (!isOpen) return null;

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (dayNum: number) => {
    const dd = String(dayNum).padStart(2, '0');
    const mm = String(calMonth + 1).padStart(2, '0');
    setTanggal(`${dd}/${mm}/${calYear}`);
    setIsDatePickerOpen(false);
  };

  // Helper saat input kelas bibit kehilangan fokus (onBlur) atau dikembalikan ke 0/kosong
  const handleKelasBlur = (val: string, setter: (v: string) => void) => () => {
    const num = parseFloat(val);
    if (!val || isNaN(num) || num <= 0) {
      setter('0.00');
    } else {
      setter(num.toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanLokasi = (lockedLokasi || lokasi).trim().toUpperCase();
    if (!cleanLokasi) {
      setError('Lokasi wajib dipilih.');
      return;
    }

    if (!tanggal.trim()) {
      setError('Tanggal transaksi wajib diisi.');
      return;
    }

    if (!aktivitas) {
      setError('Aktivitas wajib dipilih.');
      return;
    }

    if (!jenisBibit) {
      setError('Jenis Bibit wajib dipilih.');
      return;
    }

    if (calculatedTotal <= 0) {
      setError('Total luasan kelas bibit harus lebih dari 0 Ha.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/planting/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: tanggal.trim(),
          lokasi: cleanLokasi,
          aktivitas,
          jenisBibit,
          standar: parseFloat(standar) || 0,
          besar: parseFloat(besar) || 0,
          sedang: parseFloat(sedang) || 0,
          kecil: parseFloat(kecil) || 0,
          extraKecil: parseFloat(extraKecil) || 0,
          petikKe: aktivitas === 'Petik Bibit' ? petikKe.trim() : null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan transaksi.');
      }

      // Reset form
      if (!lockedLokasi) setLokasi('');
      setTanggal('');
      setAktivitas('');
      setJenisBibit('');
      setStandar('0.00');
      setBesar('0.00');
      setSedang('0.00');
      setKecil('0.00');
      setExtraKecil('0.00');
      setPetikKe('');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  // Calendar calculations
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const parsedCurrent = parseDateInput(tanggal);

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-visible animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 p-5 text-white flex items-center justify-between shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-200 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Tambah Transaksi Harian</h3>
              <p className="text-xs text-emerald-200/90">
                {lockedLokasi ? `Petak Lokasi: ${lockedLokasi}` : 'Input Real Tanam & Petik Nanas'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto overflow-x-hidden flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Lokasi & Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Lokasi */}
            <div ref={locRef}>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Lokasi <span className="text-rose-500">*</span>
              </label>
              {lockedLokasi ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 min-h-[38px]">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lockedLokasi}</span>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder=""
                    value={lokasi}
                    onChange={(e) => {
                      setLokasi(e.target.value.toUpperCase());
                      setSearchLoc(e.target.value);
                      setIsLocDropdownOpen(true);
                    }}
                    onFocus={() => setIsLocDropdownOpen(true)}
                    className={`w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[38px] ${
                      lokasi ? 'pr-9' : ''
                    }`}
                  />
                  {lokasi ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLokasi('');
                        setSearchLoc('');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-0.5 rounded-full cursor-pointer transition-colors"
                      title="Hapus lokasi"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  ) : (
                    <ChevronDown
                      className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer transition-transform duration-200 ease-in-out ${
                        isLocDropdownOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : 'rotate-0'
                      }`}
                      onClick={() => setIsLocDropdownOpen((v) => !v)}
                    />
                  )}

                  {/* Dropdown Options */}
                  {isLocDropdownOpen && filteredLocations.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 z-50 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredLocations.slice(0, 30).map((loc) => (
                        <div
                          key={loc}
                          onClick={() => {
                            setLokasi(loc);
                            setIsLocDropdownOpen(false);
                          }}
                          className="px-3.5 py-2 text-xs font-mono font-semibold hover:bg-emerald-50 dark:hover:bg-slate-800 cursor-pointer text-slate-800 dark:text-slate-200 flex items-center justify-between"
                        >
                          <span>{loc}</span>
                          {lokasi === loc && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tanggal (Dengan DatePicker) */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Tanggal <span className="text-rose-500">*</span>
              </label>
              <div
                onClick={() => {
                  setIsDatePickerOpen(!isDatePickerOpen);
                  setOpenDropdown(null);
                  setIsLocDropdownOpen(false);
                }}
                className="relative cursor-pointer"
              >
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  readOnly
                  placeholder=""
                  value={tanggal}
                  className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer min-h-[38px]"
                />
                {tanggal && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTanggal('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-0.5 rounded-full"
                    title="Hapus tanggal"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* DatePicker Popover: positioned right-0 to prevent overflowing right */}
              {isDatePickerOpen && (
                <div
                  ref={datePickerRef}
                  className="absolute right-0 top-full mt-1.5 z-[100] p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-[260px] animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {INDONESIAN_MONTHS[calMonth]} {calYear}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1.5">
                    {DAYS_SHORT.map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center">
                    {Array.from({ length: firstDayIndex }).map((_, i) => (
                      <span key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const isSelected =
                        parsedCurrent &&
                        parsedCurrent.day === dayNum &&
                        parsedCurrent.month === calMonth &&
                        parsedCurrent.year === calYear;
                      return (
                        <button
                          key={dayNum}
                          type="button"
                          onClick={() => handleSelectDate(dayNum)}
                          className={`h-7 w-7 mx-auto rounded-lg text-xs font-medium flex items-center justify-center transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white font-bold shadow-xs'
                              : 'hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setTanggal('');
                        setIsDatePickerOpen(false);
                      }}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer font-medium"
                    >
                      Kosongkan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        const dd = String(today.getDate()).padStart(2, '0');
                        const mm = String(today.getMonth() + 1).padStart(2, '0');
                        setTanggal(`${dd}/${mm}/${today.getFullYear()}`);
                        setIsDatePickerOpen(false);
                      }}
                      className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                    >
                      Hari Ini
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Aktivitas & Jenis Bibit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Aktivitas */}
            <div className="relative" ref={aktivitasRef}>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Aktivitas
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setOpenDropdown(openDropdown === 'aktivitas' ? null : 'aktivitas');
                    setIsDatePickerOpen(false);
                    setIsLocDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer flex items-center justify-between min-h-[38px] text-left transition-all"
                >
                  <span className={aktivitas ? 'font-medium' : 'text-transparent select-none'}>
                    {aktivitas || '\u00A0'}
                  </span>
                  <div>
                    {aktivitas ? (
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAktivitas('');
                        }}
                        className="p-0.5 text-slate-400 hover:text-rose-500 rounded-full cursor-pointer transition-colors inline-flex items-center"
                        title="Hapus pilihan"
                      >
                        <XCircle className="w-4 h-4 text-slate-400 hover:text-rose-500" />
                      </span>
                    ) : (
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ease-in-out ${
                          openDropdown === 'aktivitas' ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : 'rotate-0'
                        }`}
                      />
                    )}
                  </div>
                </button>

                {openDropdown === 'aktivitas' && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="space-y-0.5">
                      {AKTIVITAS_OPTIONS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => {
                            setAktivitas(a);
                            setOpenDropdown(null);
                          }}
                          className={`w-full px-3 py-2 text-xs rounded-lg text-left font-medium transition-colors cursor-pointer flex items-center justify-between ${
                            aktivitas === a
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{a}</span>
                          {aktivitas === a && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Jenis Bibit */}
            <div className="relative" ref={jenisRef}>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Jenis Bibit
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setOpenDropdown(openDropdown === 'jenis' ? null : 'jenis');
                    setIsDatePickerOpen(false);
                    setIsLocDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer flex items-center justify-between min-h-[38px] text-left transition-all"
                >
                  <span className={jenisBibit ? 'font-medium' : 'text-transparent select-none'}>
                    {jenisBibit || '\u00A0'}
                  </span>
                  <div>
                    {jenisBibit ? (
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setJenisBibit('');
                        }}
                        className="p-0.5 text-slate-400 hover:text-rose-500 rounded-full cursor-pointer transition-colors inline-flex items-center"
                        title="Hapus pilihan"
                      >
                        <XCircle className="w-4 h-4 text-slate-400 hover:text-rose-500" />
                      </span>
                    ) : (
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ease-in-out ${
                          openDropdown === 'jenis' ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : 'rotate-0'
                        }`}
                      />
                    )}
                  </div>
                </button>

                {openDropdown === 'jenis' && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="space-y-0.5">
                      {JENIS_BIBIT_OPTIONS.map((j) => (
                        <button
                          key={j}
                          type="button"
                          onClick={() => {
                            setJenisBibit(j);
                            setOpenDropdown(null);
                          }}
                          className={`w-full px-3 py-2 text-xs rounded-lg text-left font-medium transition-colors cursor-pointer flex items-center justify-between ${
                            jenisBibit === j
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{j}</span>
                          {jenisBibit === j && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Optional Petik Ke */}
          {aktivitas === 'Petik Bibit' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Petik Ke-
              </label>
              <input
                type="text"
                placeholder=""
                value={petikKe}
                onChange={(e) => setPetikKe(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Bagian Input Kelas Bibit */}
          <div className="pt-2">
            <div className="mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Kelas Bibit
              </label>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block mb-1">Standar</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={standar}
                  onFocus={(e) => {
                    if (standar === '0.00' || standar === '0') e.target.select();
                  }}
                  onChange={(e) => setStandar(e.target.value)}
                  onBlur={handleKelasBlur(standar, setStandar)}
                  className="w-full px-2.5 py-1.5 text-xs text-center font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <span className="text-[11px] font-medium text-slate-500 block mb-1">Besar</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={besar}
                  onFocus={(e) => {
                    if (besar === '0.00' || besar === '0') e.target.select();
                  }}
                  onChange={(e) => setBesar(e.target.value)}
                  onBlur={handleKelasBlur(besar, setBesar)}
                  className="w-full px-2.5 py-1.5 text-xs text-center font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <span className="text-[11px] font-medium text-slate-500 block mb-1">Sedang</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sedang}
                  onFocus={(e) => {
                    if (sedang === '0.00' || sedang === '0') e.target.select();
                  }}
                  onChange={(e) => setSedang(e.target.value)}
                  onBlur={handleKelasBlur(sedang, setSedang)}
                  className="w-full px-2.5 py-1.5 text-xs text-center font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <span className="text-[11px] font-medium text-slate-500 block mb-1">Kecil</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={kecil}
                  onFocus={(e) => {
                    if (kecil === '0.00' || kecil === '0') e.target.select();
                  }}
                  onChange={(e) => setKecil(e.target.value)}
                  onBlur={handleKelasBlur(kecil, setKecil)}
                  className="w-full px-2.5 py-1.5 text-xs text-center font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <span className="text-[11px] font-medium text-slate-500 block mb-1">Extra Kecil</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={extraKecil}
                  onFocus={(e) => {
                    if (extraKecil === '0.00' || extraKecil === '0') e.target.select();
                  }}
                  onChange={(e) => setExtraKecil(e.target.value)}
                  onBlur={handleKelasBlur(extraKecil, setExtraKecil)}
                  className="w-full px-2.5 py-1.5 text-xs text-center font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-col justify-end">
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">Total Tertanam</span>
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 font-mono">
                    {calculatedTotal.toFixed(2)} Ha
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Menyimpan...' : 'Simpan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
