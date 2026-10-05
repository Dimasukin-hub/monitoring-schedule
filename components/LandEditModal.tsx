'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Save,
  MapPin,
  Tractor,
  Layers,
  Sprout,
  BarChart2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Activity,
  FileEdit,
} from 'lucide-react';
import { computeAktivitasTerakhir } from '@/lib/landActivityUtils';

interface LandEditModalProps {
  landId: number | string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function LandEditModal({ landId, onClose, onSaved }: LandEditModalProps) {
  const [activeTab, setActiveTab] = useState<'profil' | 'aktivitas' | 'aplikasi' | 'tanam' | 'produksi'>('profil');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<any>({
    wilayah: '',
    lokasi: '',
    luasBruto: 0,
    luasNetto: 0,
    status: '',
    eks: '',
    sejarah: '',
    phBk: '',
    phSn: '',
    bulanSn: '',
    // Tanam
    jenisBibit: '',
    kelasBibit: '',
    bulanTanam: '',
    rencMulaiTanam: '',
    rencSelesaiTanam: '',
    realMulaiTanam: '',
    realSelesaiTanam: '',
    hariWaktu: '',
    progressTanam: 0,
    // Produksi
    statusProduksi: '',
    bulanPanen: '',
    stdPanen: '',
    deviasiMonth: '',
    aplikasiTerakhir: '',
    statusAplikasi: '',
    // 22 Aplikasi
    aplikasiDetails: {},
    // 10 key activities
    activities: [],
  });

  const activityConfig = [
    { code: '01.CHOPPER', name: 'Chopper', key: 'chopper' },
    { code: '02.CHOPPER_LU', name: 'Chopper Lu', key: 'chopperLu' },
    { code: '03.RH1', name: 'RH1', key: 'rh1' },
    { code: '04.CUTTING_BANANA', name: 'Cutting Banana', key: 'cuttingBanana' },
    { code: '05.DOLOMIT', name: 'Aplikasi Dolomit', key: 'dolomit' },
    { code: '06.DP1', name: 'DP 1', key: 'dp1' },
    { code: '07.DP_CROSS', name: 'DP Cross', key: 'dpCross' },
    { code: '08.DP2', name: 'DP 2', key: 'dp2' },
    { code: '09.BELERANG', name: 'Aplikasi Belerang', key: 'belerang' },
    { code: '10.KOMPOS', name: 'Aplikasi Kompos', key: 'kompos' },
  ];

  const aplikasiFields = [
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

  useEffect(() => {
    if (!landId) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    fetch(`/api/lands/${landId}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          const l = res.data;

          // Map activities from DB or empty
          const actsMap: Record<string, any> = {};
          if (Array.isArray(l.activities)) {
            for (const a of l.activities) {
              actsMap[a.code] = a;
            }
          }

          const mappedActivities = activityConfig.map((cfg) => {
            const existing = actsMap[cfg.code];
            return {
              code: cfg.code,
              name: cfg.name,
              rencanaDate: existing?.rencanaDate || '',
              realisasiDate: existing?.realisasiDate || '',
              status: existing?.status || 'PENDING',
            };
          });

          setFormData({
            wilayah: l.wilayah || '',
            lokasi: l.lokasi || '',
            luasBruto: l.luasBruto ?? '',
            luasNetto: l.luasNetto ?? '',
            status: l.status || '',
            eks: l.eks || '',
            sejarah: l.sejarah || '',
            phBk: l.phBk ?? '',
            phSn: l.phSn ?? '',
            bulanSn: l.bulanSn || '',
            jenisBibit: l.jenisBibit || '',
            kelasBibit: l.kelasBibit || '',
            bulanTanam: l.bulanTanam || '',
            rencMulaiTanam: l.rencMulaiTanam || '',
            rencSelesaiTanam: l.rencSelesaiTanam || '',
            realMulaiTanam: l.realMulaiTanam || '',
            realSelesaiTanam: l.realSelesaiTanam || '',
            hariWaktu: l.hariWaktu ?? '',
            progressTanam: l.progressTanam ?? 0,
            statusProduksi: l.statusProduksi || '',
            bulanPanen: l.bulanPanen || '',
            stdPanen: l.stdPanen || '',
            deviasiMonth: l.deviasiMonth ?? '',
            aplikasiTerakhir: l.aplikasiTerakhir || '',
            aplikasiDetails: {
              ...(l.aplikasiDetails || {}),
              jalanSal: l.jalanSal || l.aplikasiDetails?.jalanSal || '',
              siapTanam: l.siapTanam || l.aplikasiDetails?.siapTanam || '',
              prosesTanam: l.prosesTanam || l.aplikasiDetails?.prosesTanam || '',
              selesaiTanam: l.selesaiTanam || l.aplikasiDetails?.selesaiTanam || '',
            },
            activities: mappedActivities,
          });
        } else {
          setError(res.error || 'Gagal memuat data lahan');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [landId]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAplikasiChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      aplikasiDetails: {
        ...prev.aplikasiDetails,
        [field]: value,
      },
    }));
  };

  const handleActivityChange = (index: number, field: string, value: any) => {
    setFormData((prev: any) => {
      const updated = [...prev.activities];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      // Auto toggle status if realisasi date filled
      if (field === 'realisasiDate') {
        if (value && value !== '-' && value !== '0') {
          updated[index].status = 'COMPLETED';
        } else if (updated[index].rencanaDate) {
          updated[index].status = 'IN_PROGRESS';
        } else {
          updated[index].status = 'PENDING';
        }
      }
      const actCode = updated[index].code;
      const updatedFormData = {
        ...prev,
        activities: updated,
        ...(actCode === '23.PROSES_TNM' && field === 'realisasiDate' ? { realMulaiTanam: value || null } : {}),
        ...(actCode === '24.SLS_TANAM' && field === 'realisasiDate' ? { realSelesaiTanam: value || null } : {}),
      };
      return {
        ...updatedFormData,
        aplikasiTerakhir: computeAktivitasTerakhir(updatedFormData),
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        ...formData,
        aplikasiTerakhir: computeAktivitasTerakhir(formData),
      };

      const res = await fetch(`/api/lands/${landId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg('Data lahan berhasil disimpan!');
        onSaved();
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setError(json.error || 'Gagal menyimpan perubahan');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  if (!landId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20 shrink-0">
              <FileEdit className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest bg-amber-100 dark:bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-400/30">
                  EDIT DATA LAHAN
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {formData.lokasi || `Lokasi: ${landId}`}
                </h3>
                {formData.wilayah && (
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-500/20">
                    Wilayah {formData.wilayah}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Edit seluruh parameter operasional, tahapan pengolahan, aplikasi tanah, dan status tanam
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/30 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('profil')}
            className={`px-3.5 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'profil'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" /> 1. Profil Lahan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('aktivitas')}
            className={`px-3.5 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'aktivitas'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Tractor className="w-3.5 h-3.5" /> 2. Chopper s.d. Kompos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('aplikasi')}
            className={`px-3.5 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'aplikasi'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> 3. Kolom Aplikasi (22)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tanam')}
            className={`px-3.5 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'tanam'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sprout className="w-3.5 h-3.5" /> 4. Tanam & Bibit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('produksi')}
            className={`px-3.5 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'produksi'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" /> 5. Produksi & Panen
          </button>
        </div>

        {/* Content Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-slate-600 dark:text-slate-400">Memuat data lahan untuk diedit...</span>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* TAB 1: PROFIL LAHAN */}
              {activeTab === 'profil' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Informasi Lokasi & Karakteristik Fisik
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Wilayah</label>
                      <input
                        type="text"
                        value={formData.wilayah}
                        onChange={(e) => handleInputChange('wilayah', e.target.value)}
                        placeholder="Contoh: W01"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-xs transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">No Petak / Lokasi</label>
                      <input
                        type="text"
                        value={formData.lokasi}
                        onChange={(e) => handleInputChange('lokasi', e.target.value)}
                        placeholder="Contoh: 001B2"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono shadow-xs transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Status Lahan</label>
                      <input
                        type="text"
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        placeholder="Contoh: NSSC / PSY / SKBK"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Luas Bruto (Ha)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.luasBruto}
                        onChange={(e) => handleInputChange('luasBruto', e.target.value)}
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono shadow-xs transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Luas Netto (Ha)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.luasNetto}
                        onChange={(e) => handleInputChange('luasNetto', e.target.value)}
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono shadow-xs transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Eks Tanaman</label>
                      <input
                        type="text"
                        value={formData.eks}
                        onChange={(e) => handleInputChange('eks', e.target.value)}
                        placeholder="Contoh: Nenas / Rumput"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Sejarah Rotasi</label>
                      <input
                        type="text"
                        value={formData.sejarah}
                        onChange={(e) => handleInputChange('sejarah', e.target.value)}
                        placeholder="Contoh: 1x Ratoon"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">pH Tanah BK</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.phBk}
                        onChange={(e) => handleInputChange('phBk', e.target.value)}
                        placeholder="Contoh: 4.8"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">pH Tanah SN</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.phSn}
                        onChange={(e) => handleInputChange('phSn', e.target.value)}
                        placeholder="Contoh: 5.2"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Bulan Siap Tanam (SN)</label>
                      <input
                        type="text"
                        value={formData.bulanSn}
                        onChange={(e) => handleInputChange('bulanSn', e.target.value)}
                        placeholder="Contoh: Mei-26"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono shadow-xs transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AKTIVITAS CHOPPER S.D. KOMPOS */}
              {activeTab === 'aktivitas' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Jadwal Rencana & Realisasi 10 Tahapan Awal (Chopper s.d. Kompos)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Format tanggal: <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">DD/MM/YYYY</code> atau <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">DD/MM/YY</code>
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {formData.activities.map((act: any, idx: number) => (
                      <div
                        key={act.code}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="min-w-[160px]">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                            {idx + 1}. {act.name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {act.code}
                          </span>
                        </div>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="text-[10px] font-medium text-slate-600 dark:text-slate-400 block mb-1">Tanggal Rencana</label>
                            <input
                              type="text"
                              value={act.rencanaDate || ''}
                              onChange={(e) => handleActivityChange(idx, 'rencanaDate', e.target.value)}
                              placeholder="Contoh: 01/02/2026"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-xs transition-colors"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block mb-1">Tanggal Realisasi</label>
                            <input
                              type="text"
                              value={act.realisasiDate || ''}
                              onChange={(e) => handleActivityChange(idx, 'realisasiDate', e.target.value)}
                              placeholder="Contoh: 15/02/2026"
                              className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-emerald-400/50 shadow-xs transition-colors"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-medium text-slate-600 dark:text-slate-400 block mb-1">Status Tahapan</label>
                            <select
                              value={act.status || 'PENDING'}
                              onChange={(e) => handleActivityChange(idx, 'status', e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs cursor-pointer transition-colors"
                            >
                              <option value="PENDING">Belum (Pending)</option>
                              <option value="IN_PROGRESS">Proses (In Progress)</option>
                              <option value="COMPLETED">Selesai (Completed)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: 22 KOLOM APLIKASI */}
              {activeTab === 'aplikasi' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      22 Kolom Aplikasi Pengolahan Tanah Lanjutan
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Input tanggal pengolahan atau status (contoh: 20/08/2026 atau nilai rotasi)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {aplikasiFields.map((field) => (
                      <div
                        key={field.key}
                        className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                      >
                        <label className="text-xs block mb-1.5 font-semibold text-slate-800 dark:text-slate-200">
                          {field.label}
                        </label>
                        <input
                          type="text"
                          value={formData.aplikasiDetails?.[field.key] || ''}
                          onChange={(e) => handleAplikasiChange(field.key, e.target.value)}
                          placeholder="-"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-xs transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: TANAM & BIBIT */}
              {activeTab === 'tanam' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Parameter Penanaman & Varietas Bibit
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Jenis Bibit</label>
                      <input
                        type="text"
                        value={formData.jenisBibit}
                        onChange={(e) => handleInputChange('jenisBibit', e.target.value)}
                        placeholder="Contoh: Crown / Sucker"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Kelas Bibit</label>
                      <input
                        type="text"
                        value={formData.kelasBibit}
                        onChange={(e) => handleInputChange('kelasBibit', e.target.value)}
                        placeholder="Contoh: Kecil / Sedang / Besar"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Bulan Tanam</label>
                      <input
                        type="text"
                        value={formData.bulanTanam}
                        onChange={(e) => handleInputChange('bulanTanam', e.target.value)}
                        placeholder="Contoh: Jan-26"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Rencana Mulai Tanam</label>
                      <input
                        type="text"
                        value={formData.rencMulaiTanam}
                        onChange={(e) => handleInputChange('rencMulaiTanam', e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Rencana Selesai Tanam</label>
                      <input
                        type="text"
                        value={formData.rencSelesaiTanam}
                        onChange={(e) => handleInputChange('rencSelesaiTanam', e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block mb-1">Realisasi Mulai Tanam</label>
                      <input
                        type="text"
                        value={formData.realMulaiTanam}
                        onChange={(e) => handleInputChange('realMulaiTanam', e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="w-full bg-white dark:bg-slate-950 border border-emerald-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-emerald-400/50 font-mono font-medium shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block mb-1">Realisasi Selesai Tanam</label>
                      <input
                        type="text"
                        value={formData.realSelesaiTanam}
                        onChange={(e) => handleInputChange('realSelesaiTanam', e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="w-full bg-white dark:bg-slate-950 border border-emerald-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-emerald-400/50 font-mono font-medium shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Durasi Waktu (Hari)</label>
                      <input
                        type="number"
                        value={formData.hariWaktu}
                        onChange={(e) => handleInputChange('hariWaktu', e.target.value)}
                        placeholder="Contoh: 12"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Progress Tanam (%)</label>
                      <select
                        value={formData.progressTanam}
                        onChange={(e) => handleInputChange('progressTanam', parseInt(e.target.value, 10))}
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs cursor-pointer transition-colors"
                      >
                        <option value="0">0% (Belum Tanam)</option>
                        <option value="25">25% (Persiapan Akhir)</option>
                        <option value="50">50% (Sedang Proses Tanam)</option>
                        <option value="100">100% (Selesai Tanam)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PRODUKSI & PANEN */}
              {activeTab === 'produksi' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Status Operasional Produksi & Prediksi Panen
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Status Produksi</label>
                      <input
                        type="text"
                        value={formData.statusProduksi}
                        onChange={(e) => handleInputChange('statusProduksi', e.target.value)}
                        placeholder="Contoh: Standar Produksi"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Bulan Panen</label>
                      <input
                        type="text"
                        value={formData.bulanPanen}
                        onChange={(e) => handleInputChange('bulanPanen', e.target.value)}
                        placeholder="Contoh: Mei-27"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Standar Panen</label>
                      <input
                        type="text"
                        value={formData.stdPanen}
                        onChange={(e) => handleInputChange('stdPanen', e.target.value)}
                        placeholder="Contoh: Mei-27"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Deviasi Panen (Bulan)</label>
                      <input
                        type="number"
                        value={formData.deviasiMonth}
                        onChange={(e) => handleInputChange('deviasiMonth', e.target.value)}
                        placeholder="Contoh: 0"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-teal-700 dark:text-teal-400">Aktivitas Terakhir</label>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400/80 font-medium">Otomatis Terupdate</span>
                      </div>
                      <input
                        type="text"
                        value={formData.aplikasiTerakhir || computeAktivitasTerakhir(formData)}
                        onChange={(e) => handleInputChange('aplikasiTerakhir', e.target.value)}
                        placeholder="Contoh: Selesai Tanam"
                        className="w-full bg-teal-50/50 dark:bg-slate-950 border border-teal-300 dark:border-teal-700 rounded-xl px-3 py-2 text-xs text-teal-800 dark:text-teal-300 font-semibold shadow-xs transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Status Aplikasi</label>
                      <input
                        type="text"
                        value={formData.statusAplikasi}
                        onChange={(e) => handleInputChange('statusAplikasi', e.target.value)}
                        placeholder="Contoh: Sls Tanam"
                        className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-xs transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Perubahan akan langsung diperbarui ke database
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || loading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 disabled:opacity-50 text-white dark:text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white dark:border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
