'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import {
  Lock,
  User as UserIcon,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Tractor,
  ArrowRight,
  Briefcase,
  Users,
  Building2,
  Truck,
  Landmark,
} from 'lucide-react';

export type SelectedRole =
  | 'kepala_bagian_fe'
  | 'manajer_fe'
  | 'manajer_fm'
  | 'manajer_osd'
  | 'kepala_wilayah'
  | 'super_admin'
  | 'admin'
  | 'user_wilayah'
  | 'user_fe';

const ROLE_DETAILS: Record<
  SelectedRole,
  {
    title: string;
    subtitle: string;
    badge: string;
    badgeColor: string;
    iconColor: string;
    icon: React.ComponentType<{ className?: string }>;
    defaultUsername: string;
    description: string;
  }
> = {
  kepala_bagian_fe: {
    title: 'Kepala Bagian FE',
    subtitle: 'Login Kepala Bagian FE untuk monitoring eksekutif, rekapitulasi data, dan supervisi operasional',
    badge: 'Kepala Bagian FE',
    badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    iconColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    icon: Briefcase,
    defaultUsername: 'kabag_fe',
    description: 'Monitoring eksekutif, rekapitulasi data, dan supervisi operasional FE.',
  },
  manajer_fe: {
    title: 'Manajer FE',
    subtitle: 'Login Manajer FE untuk monitoring progres, verifikasi teknis, dan manajemen operasional FE',
    badge: 'Manajer FE',
    badgeColor: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
    iconColor: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    icon: Users,
    defaultUsername: 'manajer_fe',
    description: 'Monitoring progres harian, analisis kinerja lapangan, dan supervisi tim FE.',
  },
  manajer_fm: {
    title: 'Manajer FM',
    subtitle: 'Login Manajer FM untuk monitoring fasilitas, pemeliharaan infrastruktur, dan operasional FM',
    badge: 'Manajer FM',
    badgeColor: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
    iconColor: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
    icon: Building2,
    defaultUsername: 'manajer_fm',
    description: 'Monitoring fasilitas fisik, pemeliharaan infrastruktur, dan operasional FM.',
  },
  manajer_osd: {
    title: 'Manajer OSD',
    subtitle: 'Login Manajer OSD untuk koordinasi supply chain, logistik operasional, dan distribusi',
    badge: 'Manajer OSD',
    badgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    iconColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    icon: Truck,
    defaultUsername: 'manajer_osd',
    description: 'Koordinasi supply chain, logistik operasional, dan distribusi material.',
  },
  kepala_wilayah: {
    title: 'Kepala Wilayah',
    subtitle: 'Login Kepala Wilayah untuk monitoring operasional per wilayah, approval, dan rekapitulasi',
    badge: 'Kepala Wilayah',
    badgeColor: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
    iconColor: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    icon: Landmark,
    defaultUsername: 'kawil',
    description: 'Monitoring progres, approval, dan rekapitulasi data pada wilayah kerja terkait.',
  },
  super_admin: {
    title: 'Super Administrator',
    subtitle: 'Login Super Admin untuk kendali penuh sistem, hak akses user, dan konfigurasi master data',
    badge: 'Super Admin',
    badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
    iconColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    icon: ShieldAlert,
    defaultUsername: 'superadmin',
    description: 'Akses tingkat tertinggi: seluruh modul, kontrol hak akses user, dan master data.',
  },
  admin: {
    title: 'Admin FE',
    subtitle: 'Login Admin FE untuk mengelola seluruh data analitik, master data, dan konfigurasi sistem',
    badge: 'Admin FE',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    iconColor: 'bg-emerald-500/15 text-[#00873D] dark:text-emerald-400 border-emerald-500/30',
    icon: ShieldCheck,
    defaultUsername: 'admin',
    description: 'Akses penuh seluruh modul, dashboard analitik, master data, dan manajemen pengguna.',
  },
  user_wilayah: {
    title: 'Mandor Wilayah',
    subtitle: 'Login Mandor Wilayah untuk pemesanan gorong-gorong (Order, Pasang Manual, Pindah Lokasi)',
    badge: 'Mandor Wilayah',
    badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    iconColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: MapPin,
    defaultUsername: 'wilayah',
    description: 'Akses formulir transaksi: Order, Pasang Manual, dan Pindah Lokasi.',
  },
  user_fe: {
    title: 'TK Verifikator FE',
    subtitle: 'Login TK Verifikator FE untuk monitoring pengiriman dropping gorong-gorong di lapangan',
    badge: 'TK Verifikator FE',
    badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    iconColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    icon: Tractor,
    defaultUsername: 'fe',
    description: 'Akses formulir transaksi khusus konfirmasi dropping fisik material gorong-gorong.',
  },
};

// Urutan tampilan role user sebelum login (2 melebar):
// 1. Kepala Bagian FE, 2. Manajer FE
// 3. Manajer FM, 4. Manajer OSD
// 5. Kepala Wilayah, 6. Super Admin
// 7. Admin FE, 8. Mandor Wilayah
// 9. TK Verifikator FE (spanning bottom)
const ROLE_SELECTION_ORDER: SelectedRole[] = [
  'kepala_bagian_fe',
  'manajer_fe',
  'manajer_fm',
  'manajer_osd',
  'kepala_wilayah',
  'super_admin',
  'admin',
  'user_wilayah',
  'user_fe',
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, isAdmin, isSuperAdmin, isManagement, isKepalaWilayah } = useAuth();

  // State Pilihan Role (null = belum pilih, tampilkan kartu peran)
  const [selectedRole, setSelectedRole] = useState<SelectedRole | null>(null);

  // Form States Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI States
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [targetUrl, setTargetUrl] = useState<string>('/');

  useEffect(() => {
    const paramCallback = searchParams.get('callbackUrl');
    const paramRole = searchParams.get('role');

    if (paramCallback && paramCallback !== '/') {
      setTargetUrl(paramCallback);
    } else if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('ggf_active_portal');
      if (stored && stored !== '/') {
        setTargetUrl(stored);
      } else {
        setTargetUrl('/gorong-gorong/monitor-gorong-gorong');
      }
    }

    // Auto-select role jika ada parameter URL
    if (paramRole === 'super_admin' || paramRole === 'superadmin') {
      setSelectedRole('super_admin');
      setUsername('superadmin');
    } else if (paramRole === 'admin') {
      setSelectedRole('admin');
      setUsername('admin');
    } else if (paramRole === 'kepala_bagian_fe' || paramRole === 'kabag_fe' || paramRole === 'kabag') {
      setSelectedRole('kepala_bagian_fe');
      setUsername('kabag_fe');
    } else if (paramRole === 'manajer_fe') {
      setSelectedRole('manajer_fe');
      setUsername('manajer_fe');
    } else if (paramRole === 'manajer_fm') {
      setSelectedRole('manajer_fm');
      setUsername('manajer_fm');
    } else if (paramRole === 'manajer_osd') {
      setSelectedRole('manajer_osd');
      setUsername('manajer_osd');
    } else if (paramRole === 'kepala_wilayah' || paramRole === 'kawil') {
      setSelectedRole('kepala_wilayah');
      setUsername('kawil');
    } else if (paramRole === 'user_wilayah' || paramRole === 'wilayah') {
      setSelectedRole('user_wilayah');
      setUsername('wilayah');
    } else if (paramRole === 'user_fe' || paramRole === 'fe') {
      setSelectedRole('user_fe');
      setUsername('fe');
    }
  }, [searchParams]);

  // Redirect jika sudah login dan berhak mengakses targetUrl
  useEffect(() => {
    if (user) {
      let finalTarget = targetUrl;
      const isLabitaTarget = finalTarget.startsWith('/labita');
      const isSulamTarget = finalTarget.startsWith('/sulam');
      if ((isLabitaTarget || isSulamTarget) && !isSuperAdmin) {
        // Labita & Sulam khusus Super Admin
        setSelectedRole('super_admin');
        setUsername('superadmin');
        return;
      }

      const canSeeMonitor = isSuperAdmin || isAdmin || isManagement || isKepalaWilayah;
      if (!canSeeMonitor && (finalTarget === '/gorong-gorong/monitor-gorong-gorong' || finalTarget === '/gorong-gorong')) {
        finalTarget = '/gorong-gorong/form-input/order-gorong-gorong';
      }
      router.push(finalTarget);
    }
  }, [user, isAdmin, isSuperAdmin, isManagement, isKepalaWilayah, router, targetUrl]);

  // Handle Pilih Role
  const handleSelectRole = (role: SelectedRole) => {
    setSelectedRole(role);
    setErrorMsg('');
    setSuccessMsg('');
    setUsername(ROLE_DETAILS[role].defaultUsername);
    setPassword('');
  };

  // Handle Kembali ke Pilihan Role
  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setErrorMsg('');
    setSuccessMsg('');
    setUsername('');
    setPassword('');
  };

  // Handle Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    const cleanUsername = username.trim().toLowerCase();
    const res = await login(cleanUsername, password);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg('Login berhasil! Mengalihkan ke portal...');
      setTimeout(() => {
        router.push(targetUrl);
      }, 350);
    } else {
      setErrorMsg(res.message || 'Username atau kata sandi tidak sesuai.');
    }
  };

  const currentRoleInfo = selectedRole ? ROLE_DETAILS[selectedRole] : null;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-3 sm:p-6 overflow-y-auto select-none py-10 sm:py-12">
      {/* Background Lahan Nanas */}
      <div className="fixed inset-0 -z-50 pointer-events-none select-none">
        <img
          src="/assets/Lahan Nanas 2.jpg"
          alt="Lahan Nanas Background"
          className="w-full h-full object-cover object-center filter saturate-105"
        />
        {/* Soft Ambient Overlay */}
        <div className="absolute inset-0 bg-slate-950/50 dark:bg-slate-950/70 backdrop-blur-[2px]" />
      </div>

      {/* Main Container Card: Melebar saat pilih peran (max-w-4xl), fokus saat login (max-w-[460px]) */}
      <div
        className={`relative w-full ${
          !selectedRole ? 'max-w-4xl' : 'max-w-[460px]'
        } bg-white dark:bg-slate-900 rounded-[24px] sm:rounded-3xl shadow-2xl border border-white/30 dark:border-slate-800 p-5 sm:p-7 transition-all duration-300 animate-in fade-in zoom-in-95 my-auto`}
      >
        {/* Tombol Back ke Portal Asal */}
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Portal Utama</span>
          </Link>
        </div>

        {/* Top Brand Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="w-13 h-13 rounded-2xl bg-white border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-center p-2 shadow-xs mb-2">
            <img
              src="/assets/logo.png"
              alt="GGF Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <h2 className="text-[11px] sm:text-xs font-black tracking-wider uppercase text-emerald-700 dark:text-emerald-400">
            Plantation Group 1 • Great Giant Foods
          </h2>
        </div>

        {/* Notifikasi Alerts */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Notifikasi jika user aktif saat ini non-admin dan mencoba masuk ke Portal Labita / Sulam */}
        {user && !isSuperAdmin && (targetUrl.startsWith('/labita') || targetUrl.startsWith('/sulam')) && (
          <div className="mt-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>
              Akun aktif saat ini (<strong>{user.name || user.email}</strong>) bukan Super Administrator. Modul ini khusus untuk Super Administrator. Silakan login sebagai Super Admin.
            </span>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAHAP 1: PILIH PERAN TERLEBIH DAHULU (DUA MELEBAR)              */}
        {/* Urutan: Kepala Bagian FE, Manajer FE, Manajer FM, Manajer OSD, */}
        {/* Kepala Wilayah, Super Admin, Admin FE, Mandor Wilayah, FE      */}
        {/* ============================================================== */}
        {!selectedRole ? (
          <div className="mt-4 space-y-4">
            <div className="text-center mb-4">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Pilih Peran Akses Login
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Pilih peran kerja Anda untuk masuk ke sistem:
              </p>
            </div>

            {/* Dua Melebar (Grid 2 Kolom Responsif) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              {ROLE_SELECTION_ORDER.map((roleKey, idx) => {
                const roleInfo = ROLE_DETAILS[roleKey];
                const IconComponent = roleInfo.icon;
                const isOddLast =
                  idx === ROLE_SELECTION_ORDER.length - 1 && ROLE_SELECTION_ORDER.length % 2 !== 0;

                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => handleSelectRole(roleKey)}
                    className={`group w-full p-3.5 sm:p-4 rounded-2xl border-2 border-slate-200/90 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 bg-slate-50/70 hover:bg-emerald-50/20 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-all text-left flex items-center justify-between cursor-pointer shadow-2xs hover:shadow-md ${
                      isOddLast ? 'sm:col-span-2' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${roleInfo.iconColor} flex items-center justify-center border shrink-0 group-hover:scale-110 transition-transform`}
                      >
                        <IconComponent className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                            {roleInfo.title}
                          </span>
                          <span
                            className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleInfo.badgeColor}`}
                          >
                            {roleInfo.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                          {roleInfo.description}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0 ml-1" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* TAHAP 2: FORM LOGIN (TANPA PENDAFTARAN MANDIRI)               */
          /* ============================================================== */
          <div className="mt-4">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border mb-2 shadow-2xs">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    selectedRole === 'super_admin'
                      ? 'bg-indigo-500'
                      : selectedRole === 'admin'
                      ? 'bg-emerald-500'
                      : selectedRole === 'kepala_bagian_fe'
                      ? 'bg-purple-500'
                      : selectedRole === 'manajer_fe'
                      ? 'bg-cyan-500'
                      : selectedRole === 'manajer_fm'
                      ? 'bg-teal-500'
                      : selectedRole === 'manajer_osd'
                      ? 'bg-rose-500'
                      : selectedRole === 'kepala_wilayah'
                      ? 'bg-orange-500'
                      : selectedRole === 'user_wilayah'
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                />
                <span className="text-slate-700 dark:text-slate-300 font-extrabold">
                  Peran: {currentRoleInfo?.title}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Login {currentRoleInfo?.title}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-xs mx-auto">
                {currentRoleInfo?.subtitle}
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Username
                </label>
                <div className="flex items-center w-full px-4 py-3 rounded-2xl bg-[#f0f5ff] dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 focus-within:ring-2 focus-within:ring-[#008f68]/30 focus-within:border-[#008f68] transition-all">
                  <UserIcon className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={currentRoleInfo?.defaultUsername || 'username'}
                    className="bg-transparent flex-1 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none placeholder:text-slate-400/80"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Kata Sandi
                </label>
                <div className="flex items-center w-full px-4 py-3 rounded-2xl bg-[#f0f5ff] dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 focus-within:ring-2 focus-within:ring-[#008f68]/30 focus-within:border-[#008f68] transition-all">
                  <Lock className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-transparent flex-1 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none placeholder:text-slate-400/80"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer p-0.5 ml-2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Tombol Login */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#00873D] hover:bg-[#007033] active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-6"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isSubmitting ? 'Memproses...' : 'Login'}</span>
              </button>

              {/* Tombol Ganti Peran */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleBackToRoleSelection}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:underline cursor-pointer"
                >
                  Ganti Peran
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">
          Memuat...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
