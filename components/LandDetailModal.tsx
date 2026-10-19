'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  CircleDashed,
  Sprout,
  Tractor,
  BarChart2,
  FileText,
  Activity,
  Save,
  Check,
  AlertCircle,
} from 'lucide-react';
import TableDatePicker from '@/components/TableDatePicker';
import { REAL_MASTER_STATUSES } from '@/components/LandTable';

interface LandDetailModalProps {
  landId: number | string | null;
  onClose: () => void;
  onUpdated?: () => void;
  onOpenEdit?: (landId: number | string) => void;
}

const STANDARD_BONGKAR_ACTIVITIES = [
  { code: '01.CHOPPER', name: 'Chopper', stepOrder: 1 },
  { code: '02.CHOPPER_LU', name: 'Chopper Lu', stepOrder: 2 },
  { code: '03.RH1', name: 'RH1', stepOrder: 3 },
  { code: '04.CUTTING_BANANA', name: 'Cutting Banana', stepOrder: 4 },
  { code: '05.DOLOMIT', name: 'Aplikasi Dolomit', stepOrder: 5 },
  { code: '06.DP1', name: 'DP 1', stepOrder: 6 },
  { code: '07.DP_CROSS', name: 'DP Cross', stepOrder: 7 },
  { code: '08.DP2', name: 'DP 2', stepOrder: 8 },
  { code: '09.BELERANG', name: 'Aplikasi Belerang', stepOrder: 9 },
  { code: '10.KOMPOS', name: 'Aplikasi Kompos', stepOrder: 10 },
];

const APLIKASI_CONFIG = [
  { key: 'rotaryPlough', label: 'Rotary Plough' },
  { key: 'bajakAwalMb5Btr', label: 'Bajak MB 5 BTR' },
  { key: 'bajakAwalMb25', label: 'Bajak MB 2.5' },
  { key: 'bajakAwalMph', label: 'Bajak MPH' },
  { key: 'bajakAwalNardi', label: 'Bajak Nardi' },
  { key: 'hrEksMb', label: 'HR Eks MB' },
  { key: 'rgKons', label: 'RG Kons (Tanaman Sela)' },
  { key: 'tnmKons', label: 'TNM Kons (Tanaman Sela)' },
  { key: 'umurKons', label: 'Umur Kons' },
  { key: 'chopperEksKons', label: 'Chopper Eks Kons' },
  { key: 'bajakAkhirMb5Btr', label: 'Bajak Akhir MB 5 BTR' },
  { key: 'bajakAkhirMb25Ahir', label: 'Bajak Akhir MB 2.5' },
  { key: 'bajakAkhirHowardAhir', label: 'Bajak Akhir Howard' },
  { key: 'bajakAkhirCelliAhir', label: 'Bajak Akhir Celli' },
  { key: 'subsoilerSs1', label: 'Subsoiler SS1' },
  { key: 'subsoilerSs2', label: 'Subsoiler SS2' },
  { key: 'finishingFhkRent', label: 'Finishing FHK Rent' },
  { key: 'finishingRotaryFh1', label: 'Finishing Rotary FH1' },
  { key: 'finishingRotaryFh2', label: 'Finishing Rotary FH2' },
  { key: 'ridger', label: 'Ridger' },
  { key: 'jalanSal', label: 'Jalan & Saluran' },
  { key: 'siapTanam', label: 'Siap Tanam' },
  { key: 'prosesTanam', label: 'Proses Tanam' },
  { key: 'selesaiTanam', label: 'Selesai Tanam' },
];

export default function LandDetailModal({
  landId,
  onClose,
  onUpdated,
}: LandDetailModalProps) {
  const [land, setLand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!landId) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    fetch(`/api/lands/${landId}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          const raw = res.data;

          // Merge activities with standard list so all 10 standard activities are editable
          const actsMap: Record<string, any> = {};
          if (Array.isArray(raw.activities)) {
            raw.activities.forEach((a: any) => {
              actsMap[a.code] = a;
            });
          }

          const mergedActs = STANDARD_BONGKAR_ACTIVITIES.map((std) => {
            const existing = actsMap[std.code];
            return {
              id: existing?.id,
              code: std.code,
              name: std.name,
              stepOrder: std.stepOrder,
              rencanaDate: existing?.rencanaDate || null,
              realisasiDate: existing?.realisasiDate || null,
              status: existing?.status || 'PENDING',
            };
          });

          // Ensure aplikasiDetails has all keys mapped
          const appDetails =
            typeof raw.aplikasiDetails === 'object' && raw.aplikasiDetails !== null
              ? { ...raw.aplikasiDetails }
              : {};
          
          APLIKASI_CONFIG.forEach((f) => {
            if (appDetails[f.key] === undefined) {
              appDetails[f.key] = raw[f.key] || null;
            }
          });

          const completedCount = mergedActs.filter((a) => a.status === 'COMPLETED').length;
          const totalCount = mergedActs.length;
          const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

          setLand({
            ...raw,
            activities: mergedActs,
            aplikasiDetails: appDetails,
            completedActivitiesCount: completedCount,
            totalActivitiesCount: totalCount,
            preparationProgress: progress,
          });
        } else {
          setError(res.error || 'Gagal memuat detail lahan');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [landId]);

  if (!landId) return null;

  const updateFormField = (field: string, value: any) => {
    setLand((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const updateAplikasiDetail = (field: string, value: any) => {
    setLand((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
        aplikasiDetails: {
          ...(prev.aplikasiDetails || {}),
          [field]: value,
        },
      };
    });
  };

  const updateActivityDate = (
    code: string,
    type: 'rencanaDate' | 'realisasiDate',
    val: string | null
  ) => {
    setLand((prev: any) => {
      if (!prev) return prev;
      const currentActs = prev.activities ? [...prev.activities] : [];
      const idx = currentActs.findIndex((a: any) => a.code === code);
      if (idx >= 0) {
        currentActs[idx] = {
          ...currentActs[idx],
          [type]: val,
        };
        // Auto update status
        if (type === 'realisasiDate') {
          if (val && val !== '-' && val !== '0') {
            currentActs[idx].status = 'COMPLETED';
          } else if (currentActs[idx].rencanaDate && currentActs[idx].rencanaDate !== '-') {
            currentActs[idx].status = 'IN_PROGRESS';
          } else {
            currentActs[idx].status = 'PENDING';
          }
        }
      }

      const completedCount = currentActs.filter((a) => a.status === 'COMPLETED').length;
      const totalCount = currentActs.length;
      const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      return {
        ...prev,
        activities: currentActs,
        completedActivitiesCount: completedCount,
        preparationProgress: progress,
      };
    });
  };

  const updateActivityStatus = (code: string, newStatus: string) => {
    setLand((prev: any) => {
      if (!prev) return prev;
      const currentActs = prev.activities ? [...prev.activities] : [];
      const idx = currentActs.findIndex((a: any) => a.code === code);
      if (idx >= 0) {
        currentActs[idx] = {
          ...currentActs[idx],
          status: newStatus,
        };
      }
      const completedCount = currentActs.filter((a) => a.status === 'COMPLETED').length;
      const totalCount = currentActs.length;
      const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      return {
        ...prev,
        activities: currentActs,
        completedActivitiesCount: completedCount,
        preparationProgress: progress,
      };
    });
  };

  const handleSave = async () => {
    if (!landId || !land) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        ...land,
        luasBruto: Number(land.luasBruto) || 0,
        luasNetto: Number(land.luasNetto) || 0,
        progressTanam: Number(land.progressTanam) || 0,
        hariWaktu: land.hariWaktu !== null && land.hariWaktu !== '' ? parseInt(land.hariWaktu, 10) : null,
        deviasiMonth: land.deviasiMonth !== null && land.deviasiMonth !== '' ? parseInt(land.deviasiMonth, 10) : null,
        phBk: land.phBk !== null && land.phBk !== '' ? Number(land.phBk) : null,
        phSn: land.phSn !== null && land.phSn !== '' ? Number(land.phSn) : null,
        aplikasiDetails: land.aplikasiDetails || {},
        activities: land.activities || [],
      };

      const res = await fetch(`/api/lands/${landId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg('Perubahan data berhasil disimpan!');
        if (onUpdated) {
          onUpdated();
        }
        setTimeout(() => {
          setSuccessMsg(null);
        }, 3500);
      } else {
        setError(json.error || 'Gagal menyimpan perubahan');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-500/20 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  DETAIL & EDIT LOKASI
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-sm">
                  {land?.lokasi || `Lokasi: ${landId}`}
                </span>
                
                {/* Wilayah Editable Selector */}
                {land && (
                  <select
                    value={land.wilayah || 'W01'}
                    onChange={(e) => updateFormField('wilayah', e.target.value)}
                    className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-500/30 focus:outline-none cursor-pointer"
                  >
                    <option value="W01">Wilayah W01</option>
                    <option value="W02">Wilayah W02</option>
                    <option value="W03">Wilayah W03</option>
                    <option value="W04">Wilayah W04</option>
                  </select>
                )}

                {/* Status Lahan Editable Selector */}
                {land && (() => {
                  const currentSts = land.status ? land.status.replace(/\d+/g, '').trim() : '';
                  const statusList = Array.from(new Set([...REAL_MASTER_STATUSES, currentSts].filter(Boolean))).sort();
                  return (
                    <select
                      value={currentSts}
                      onChange={(e) => updateFormField('status', e.target.value)}
                      className="text-xs font-semibold text-cyan-800 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-300 dark:border-cyan-500/30 focus:outline-none cursor-pointer"
                    >
                      {!currentSts && <option value="">-- Pilih Status --</option>}
                      {statusList.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              {/* Luas Netto & Bruto Direct Inputs */}
              {land && (
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">Luas Netto:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={land.luasNetto ?? ''}
                      onChange={(e) => updateFormField('luasNetto', e.target.value)}
                      className="w-16 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 text-center focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span>Ha</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">Bruto:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={land.luasBruto ?? ''}
                      onChange={(e) => updateFormField('luasBruto', e.target.value)}
                      className="w-16 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 text-center focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span>Ha</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Save Button */}
            {land && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                title="Simpan semua perubahan isian data"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success or Error Banners */}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white dark:bg-slate-900">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Memuat profil dan isian data lokasi...</span>
            </div>
          ) : !land ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-sm font-medium">
              Data lahan tidak ditemukan.
            </div>
          ) : (
            <>
              {/* 1. Informasi Lahan */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Informasi Lahan
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Eks Tanaman */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Eks Tanaman</span>
                    <input
                      type="text"
                      value={land.eks || ''}
                      onChange={(e) => updateFormField('eks', e.target.value)}
                      placeholder="Contoh: TEBU"
                      className="w-full mt-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Sejarah Rotasi */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Sejarah Rotasi</span>
                    <input
                      type="text"
                      value={land.sejarah || ''}
                      onChange={(e) => updateFormField('sejarah', e.target.value)}
                      placeholder="Contoh: R3"
                      className="w-full mt-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* pH Tanah (BK & SN) */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">pH Tanah (BK / SN)</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="number"
                        step="0.1"
                        value={land.phBk ?? ''}
                        onChange={(e) => updateFormField('phBk', e.target.value)}
                        placeholder="BK"
                        className="w-full px-1.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-emerald-700 dark:text-emerald-400 text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="text-slate-400 font-bold">/</span>
                      <input
                        type="number"
                        step="0.1"
                        value={land.phSn ?? ''}
                        onChange={(e) => updateFormField('phSn', e.target.value)}
                        placeholder="SN"
                        className="w-full px-1.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-emerald-700 dark:text-emerald-400 text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* BKR (Renc / Real) */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">BKR (Renc / Real)</span>
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] text-slate-400 font-semibold">Renc:</span>
                        <TableDatePicker
                          value={land.rencBkr}
                          onChange={(val) => updateFormField('rencBkr', val)}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">Real:</span>
                        <TableDatePicker
                          isReal
                          value={land.realBkr}
                          onChange={(val) => updateFormField('realBkr', val)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bajak (Renc / Real) */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Bajak (Renc / Real)</span>
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] text-slate-400 font-semibold">Renc:</span>
                        <TableDatePicker
                          value={land.rencBajak}
                          onChange={(val) => updateFormField('rencBajak', val)}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">Real:</span>
                        <TableDatePicker
                          isReal
                          value={land.realBajak}
                          onChange={(val) => updateFormField('realBajak', val)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Aktivitas Terakhir */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Aktivitas Terakhir</span>
                    <input
                      type="text"
                      value={land.aktivitasTerakhir || ''}
                      onChange={(e) => updateFormField('aktivitasTerakhir', e.target.value)}
                      placeholder="Contoh: BAJAK AWAL"
                      className="w-full mt-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-teal-700 dark:text-teal-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Bulan Siap Tanam (SN) */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Bulan Siap Tanam (SN)</span>
                    <div className="mt-1 flex items-center justify-center">
                      <TableDatePicker
                        isMonthOnly
                        value={land.bulanSn}
                        onChange={(val) => updateFormField('bulanSn', val)}
                      />
                    </div>
                  </div>

                  {/* Status Aplikasi */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Status Aplikasi</span>
                    <input
                      type="text"
                      value={land.statusAplikasi || ''}
                      onChange={(e) => updateFormField('statusAplikasi', e.target.value)}
                      placeholder="Contoh: ON PROGRESS"
                      className="w-full mt-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Rencana Bero Bongkar (Excel Kolom BE) */}
                  <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 shadow-2xs">
                    <span className="text-[10px] text-amber-800 dark:text-amber-400 font-semibold block">Renc Bero Bongkar (Kolom BE)</span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                        {land.rencanaBeroBongkar !== null && land.rencanaBeroBongkar !== undefined ? `${land.rencanaBeroBongkar} hari` : '-'}
                      </span>
                      {land.kondisiBeroBongkar && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                          land.kondisiBeroBongkar === 3
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : land.kondisiBeroBongkar === 2
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                        }`}>
                          {land.kondisiBeroBongkar === 3 ? 'Real' : land.kondisiBeroBongkar === 2 ? 'Proses' : 'Rencana'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Timeline Aktivitas (10 Bongkar Activities) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 flex items-center gap-1.5">
                    <Tractor className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Timeline Aktivitas Pengolahan (Edit Tanggal Langsung)
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Progress: <strong className="text-emerald-700 dark:text-emerald-400">{land.preparationProgress}%</strong>
                    </span>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                      {land.completedActivitiesCount} / {land.totalActivitiesCount} Selesai
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 max-h-80 overflow-y-auto space-y-2.5">
                  {land.activities?.map((act: any, idx: number) => {
                    const isCompleted = act.status === 'COMPLETED';
                    const isInProgress = act.status === 'IN_PROGRESS';
                    return (
                      <div
                        key={act.code || idx}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all shadow-2xs ${
                          isCompleted
                            ? 'bg-emerald-50/90 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                            : isInProgress
                            ? 'bg-amber-50/90 border-amber-300 dark:bg-amber-950/20 dark:border-amber-500/30 text-amber-900 dark:text-amber-200'
                            : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            ) : isInProgress ? (
                              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" />
                            ) : (
                              <CircleDashed className="w-5 h-5 text-slate-400 dark:text-slate-600" />
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-bold block text-slate-900 dark:text-slate-200">
                              {idx + 1}. {act.name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                              Kode: {act.code}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Dates and Status Select */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end">
                              <span className="text-[9px] text-slate-400 font-medium">Rencana</span>
                              <TableDatePicker
                                value={act.rencanaDate}
                                onChange={(val) => updateActivityDate(act.code, 'rencanaDate', val)}
                              />
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">Real</span>
                              <TableDatePicker
                                isReal
                                value={act.realisasiDate}
                                onChange={(val) => updateActivityDate(act.code, 'realisasiDate', val)}
                              />
                            </div>
                          </div>

                          {/* Status Dropdown */}
                          <select
                            value={act.status || 'PENDING'}
                            onChange={(e) => updateActivityStatus(act.code, e.target.value)}
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                              isCompleted
                                ? 'bg-emerald-600 text-white border-emerald-700'
                                : isInProgress
                                ? 'bg-amber-500 text-white border-amber-600'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            <option value="PENDING">Belum</option>
                            <option value="IN_PROGRESS">Proses</option>
                            <option value="COMPLETED">Selesai</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Detail Kolom Aplikasi (24 Aplikasi Fields) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Detail 24 Kolom Aplikasi (Klik untuk Edit Tanggal)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {APLIKASI_CONFIG.map((item) => {
                    const currentVal = land.aplikasiDetails?.[item.key] || land[item.key] || null;
                    return (
                      <div
                        key={item.key}
                        className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between"
                      >
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block truncate mb-1" title={item.label}>
                          {item.label}
                        </span>
                        <div className="flex items-center justify-center">
                          <TableDatePicker
                            value={currentVal}
                            onChange={(val) => updateAplikasiDetail(item.key, val)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Informasi Tanam */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <Sprout className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Informasi Tanam
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Jenis Bibit */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Jenis Bibit</span>
                    <input
                      type="text"
                      value={land.jenisBibit || ''}
                      onChange={(e) => updateFormField('jenisBibit', e.target.value)}
                      placeholder="Contoh: TC"
                      className="w-full mt-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-emerald-700 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Kelas Bibit */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Kelas Bibit</span>
                    <input
                      type="text"
                      value={land.kelasBibit || ''}
                      onChange={(e) => updateFormField('kelasBibit', e.target.value)}
                      placeholder="Contoh: Std"
                      className="w-full mt-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Bulan Tanam */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Bulan Tanam</span>
                    <div className="mt-1 flex items-center justify-center">
                      <TableDatePicker
                        isMonthOnly
                        value={land.bulanTanam}
                        onChange={(val) => updateFormField('bulanTanam', val)}
                      />
                    </div>
                  </div>

                  {/* Rencana Tanam (Mulai / Selesai) */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Rencana Tanam (Mulai / Selesai)</span>
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] text-slate-400 font-semibold">Mulai:</span>
                        <TableDatePicker
                          value={land.rencMulaiTanam}
                          onChange={(val) => updateFormField('rencMulaiTanam', val)}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] text-slate-400 font-semibold">Selesai:</span>
                        <TableDatePicker
                          value={land.rencSelesaiTanam}
                          onChange={(val) => updateFormField('rencSelesaiTanam', val)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Realisasi Tanam (Mulai / Selesai) */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Real Tanam (Mulai / Selesai)</span>
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">Mulai:</span>
                        <TableDatePicker
                          isReal
                          value={land.realMulaiTanam}
                          onChange={(val) => updateFormField('realMulaiTanam', val)}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">Selesai:</span>
                        <TableDatePicker
                          isReal
                          value={land.realSelesaiTanam}
                          onChange={(val) => updateFormField('realSelesaiTanam', val)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Durasi Tanam */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Durasi Tanam (Hari)</span>
                    <input
                      type="number"
                      value={land.hariWaktu ?? ''}
                      onChange={(e) => updateFormField('hariWaktu', e.target.value)}
                      placeholder="0 Hari"
                      className="w-full mt-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Progress Tanam */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Progress Tanam (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={land.progressTanam ?? 0}
                      onChange={(e) => updateFormField('progressTanam', e.target.value)}
                      placeholder="%"
                      className="w-full mt-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-emerald-700 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Informasi Produksi */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Informasi Produksi
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Status Produksi */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Status Produksi</span>
                    <input
                      type="text"
                      value={land.statusProduksi || ''}
                      onChange={(e) => updateFormField('statusProduksi', e.target.value)}
                      placeholder="Contoh: NORMAL / PANEN"
                      className="w-full mt-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-cyan-700 dark:text-cyan-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Bulan Panen */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Bulan Panen</span>
                    <div className="mt-1 flex items-center justify-center">
                      <TableDatePicker
                        isMonthOnly
                        value={land.bulanPanen}
                        onChange={(val) => updateFormField('bulanPanen', val)}
                      />
                    </div>
                  </div>

                  {/* Standar Panen */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Standar Panen</span>
                    <input
                      type="text"
                      value={land.stdPanen || ''}
                      onChange={(e) => updateFormField('stdPanen', e.target.value)}
                      placeholder="Standar panen"
                      className="w-full mt-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Deviasi (Bulan) */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Deviasi (Bulan)</span>
                    <input
                      type="number"
                      value={land.deviasiMonth ?? ''}
                      onChange={(e) => updateFormField('deviasiMonth', e.target.value)}
                      placeholder="0 Bln"
                      className="w-full mt-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Data tersinkronisasi otomatis dengan PostgreSQL database
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
