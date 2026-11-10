'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import {
  Lock,
  User as UserIcon,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Tractor,
  ArrowRight,
  UserPlus,
  BadgeCheck,
} from 'lucide-react';

export type SelectedRole = 'admin' | 'user_wilayah' | 'user_fe';

const ROLE_DETAILS = {
  admin: {
    title: 'Administrator',
    subtitle: 'Login Administrator untuk mengelola seluruh data analitik, master data, dan konfigurasi',
    badge: 'Admin System',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    iconColor: 'bg-emerald-500/15 text-[#00873D] dark:text-emerald-400 border-emerald-500/30',
    icon: ShieldCheck,
    defaultUsername: 'admin',
    description: 'Akses penuh seluruh modul, dashboard analitik, master data, dan manajemen pengguna.',
  },
  user_wilayah: {
    title: 'User Wilayah',
    subtitle: 'Login User Wilayah untuk pemesanan gorong-gorong dan pemantauan per wilayah (AW01 - AW07)',
    badge: 'Operasional Wilayah',
    badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    iconColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: MapPin,
    defaultUsername: 'wilayah',
    description: 'Akses operasional wilayah lapangan, formulir permintaan, dan kontrol kebutuhan petak.',
  },
  user_fe: {
    title: 'User FE (Field Establishment)',
    subtitle: 'Login User FE untuk monitoring pengiriman dropping dan pemasangan fisik gorong-gorong',
    badge: 'Field Establishment',
    badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    iconColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    icon: Tractor,
    defaultUsername: 'fe',
    description: 'Akses pengawasan lapangan, progres drop material, dan instalasi gorong-gorong.',
  },
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, user } = useAuth();

  // State Pilihan Role (null = belum pilih, tampilkan 3 kartu)
  const [selectedRole, setSelectedRole] = useState<SelectedRole | null>(null);

  // Mode Register vs Login (hanya aktif untuk user_wilayah & user_fe)
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // Form States Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form States Register
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

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

    // Auto-select role jika ada parameter URL (misal: ?role=admin)
    if (paramRole === 'admin') {
      setSelectedRole('admin');
    } else if (paramRole === 'user_wilayah' || paramRole === 'wilayah') {
      setSelectedRole('user_wilayah');
    } else if (paramRole === 'user_fe' || paramRole === 'fe') {
      setSelectedRole('user_fe');
    }
  }, [searchParams]);

  // Redirect jika sudah login
  useEffect(() => {
    if (user) {
      router.push(targetUrl);
    }
  }, [user, router, targetUrl]);

  // Handle Pilih Role
  const handleSelectRole = (role: SelectedRole) => {
    setSelectedRole(role);
    setIsRegistering(false);
    setErrorMsg('');
    setSuccessMsg('');
    setUsername(ROLE_DETAILS[role].defaultUsername);
    setPassword('');
    setRegName('');
    setRegUsername('');
    setRegPassword('');
    setRegConfirmPassword('');
  };

  // Handle Kembali ke Pilihan Role
  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setIsRegistering(false);
    setErrorMsg('');
    setSuccessMsg('');
    setUsername('');
    setPassword('');
    setRegName('');
    setRegUsername('');
    setRegPassword('');
    setRegConfirmPassword('');
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

  // Handle Submit Register (untuk User Wilayah & User FE)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedRole || selectedRole === 'admin') {
      setErrorMsg('Pendaftaran mandiri akun administrator tidak diperbolehkan.');
      return;
    }

    const cleanUsername = regUsername.trim().toLowerCase();
    const cleanName = regName.trim();

    if (!cleanUsername) {
      setErrorMsg('Username wajib diisi.');
      return;
    }

    if (cleanUsername.length < 3) {
      setErrorMsg('Username minimal 3 karakter.');
      return;
    }

    if (/\s/.test(cleanUsername)) {
      setErrorMsg('Username tidak boleh mengandung spasi.');
      return;
    }

    if (!regPassword || regPassword.length < 8) {
      setErrorMsg('Kata sandi minimal 8 karakter.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    const res = await register(
      cleanName || cleanUsername,
      cleanUsername,
      regPassword,
      selectedRole
    );
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg('Pendaftaran akun berhasil! Mengalihkan ke sistem...');
      setTimeout(() => {
        router.push(targetUrl);
      }, 450);
    } else {
      setErrorMsg(res.message || 'Gagal mendaftarkan akun baru.');
    }
  };

  const currentRoleInfo = selectedRole ? ROLE_DETAILS[selectedRole] : null;
  const RoleIcon = currentRoleInfo ? currentRoleInfo.icon : ShieldCheck;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      {/* Background Lahan Nanas */}
      <div className="absolute inset-0 -z-50 pointer-events-none select-none">
        <img
          src="/assets/Lahan Nanas 2.jpg"
          alt="Lahan Nanas Background"
          className="w-full h-full object-cover object-center filter saturate-105"
        />
        {/* Soft Ambient Overlay */}
        <div className="absolute inset-0 bg-slate-950/50 dark:bg-slate-950/70 backdrop-blur-[2px]" />
      </div>

      {/* Main Container Card */}
      <div className="relative w-full max-w-[460px] bg-white dark:bg-slate-900 rounded-[28px] sm:rounded-3xl shadow-2xl border border-white/30 dark:border-slate-800 p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
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
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-center p-2 shadow-xs mb-3">
            <img
              src="/assets/logo.png"
              alt="GGF Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <h2 className="text-xs font-black tracking-wider uppercase text-emerald-700 dark:text-emerald-400">
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

        {/* ============================================================== */}
        {/* TAHAP 1: PILIH PERAN TERLEBIH DAHULU (ADMIN / WILAYAH / FE) */}
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

            <div className="grid grid-cols-1 gap-3">
              {/* Pilihan 1: Administrator */}
              <button
                type="button"
                onClick={() => handleSelectRole('admin')}
                className="group w-full p-4 rounded-2xl border-2 border-slate-200/90 dark:border-slate-800 hover:border-[#00873D] dark:hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/20 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-all text-left flex items-center justify-between cursor-pointer shadow-xs hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-[#00873D] dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-[#00873D] dark:group-hover:text-emerald-400 transition-colors">
                        Administrator
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        Admin
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      Akses penuh: Dashboard, Master Data, Manajemen User &amp; Pengaturan
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#00873D] dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
              </button>

              {/* Pilihan 2: User Wilayah */}
              <button
                type="button"
                onClick={() => handleSelectRole('user_wilayah')}
                className="group w-full p-4 rounded-2xl border-2 border-slate-200/90 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/20 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-all text-left flex items-center justify-between cursor-pointer shadow-xs hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 group-hover:scale-110 transition-transform">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        User Wilayah
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                        Wilayah
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      Akses operasional wilayah lapangan &amp; formulir order gorong-gorong
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
              </button>

              {/* Pilihan 3: User FE */}
              <button
                type="button"
                onClick={() => handleSelectRole('user_fe')}
                className="group w-full p-4 rounded-2xl border-2 border-slate-200/90 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/20 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-all text-left flex items-center justify-between cursor-pointer shadow-xs hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/30 group-hover:scale-110 transition-transform">
                    <Tractor className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        User FE
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        Field Establishment
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      Akses pemantauan progres dropping lapangan &amp; pemasangan fisik
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
              </button>
            </div>
          </div>
        ) : isRegistering ? (
          /* ============================================================== */
          /* TAHAP 2B: FORM DAFTAR AKUN BARU (USER WILAYAH / USER FE)       */
          /* ============================================================== */
          <div className="mt-4">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border mb-2 shadow-2xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedRole === 'user_wilayah' ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                />
                <span className="text-slate-700 dark:text-slate-300 font-extrabold">
                  Pendaftaran: {currentRoleInfo?.title}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Daftar Akun {currentRoleInfo?.title}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-xs mx-auto">
                Lengkapi informasi berikut untuk membuat akun operasional baru
              </p>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Nama Lengkap
                </label>
                <div className="flex items-center w-full px-4 py-3 rounded-2xl bg-[#f0f5ff] dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 focus-within:ring-2 focus-within:ring-[#008f68]/30 focus-within:border-[#008f68] transition-all">
                  <BadgeCheck className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Contoh: Ahmad Fauzi"
                    className="bg-transparent flex-1 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none placeholder:text-slate-400/80"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Username <span className="text-[10px] font-normal text-slate-500">(min. 3 huruf, tanpa spasi)</span>
                </label>
                <div className="flex items-center w-full px-4 py-3 rounded-2xl bg-[#f0f5ff] dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 focus-within:ring-2 focus-within:ring-[#008f68]/30 focus-within:border-[#008f68] transition-all">
                  <UserIcon className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Contoh: ahmad_fe atau wilayah_03"
                    className="bg-transparent flex-1 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none placeholder:text-slate-400/80"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Kata Sandi <span className="text-[10px] font-normal text-slate-500">(min. 8 karakter)</span>
                </label>
                <div className="flex items-center w-full px-4 py-3 rounded-2xl bg-[#f0f5ff] dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 focus-within:ring-2 focus-within:ring-[#008f68]/30 focus-within:border-[#008f68] transition-all">
                  <Lock className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="bg-transparent flex-1 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none placeholder:text-slate-400/80"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer p-0.5 ml-2"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Ulangi Kata Sandi
                </label>
                <div className="flex items-center w-full px-4 py-3 rounded-2xl bg-[#f0f5ff] dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 focus-within:ring-2 focus-within:ring-[#008f68]/30 focus-within:border-[#008f68] transition-all">
                  <Lock className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
                  <input
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi"
                    className="bg-transparent flex-1 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none placeholder:text-slate-400/80"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer p-0.5 ml-2"
                  >
                    {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Tombol Submit Register */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#00873D] hover:bg-[#007033] active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-5"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>
                  {isSubmitting ? 'Mendaftarkan Akun...' : `Daftar Akun ${currentRoleInfo?.title}`}
                </span>
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

              {/* Pindah ke Form Login */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Sudah memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(false);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="font-bold text-[#00873D] dark:text-emerald-400 hover:underline cursor-pointer ml-1 inline-flex items-center gap-1"
                  >
                    <span>Login di sini</span>
                  </button>
                </p>
              </div>
            </form>
          </div>
        ) : (
          /* ============================================================== */
          /* TAHAP 2A: FORM LOGIN (SESUAI PERAN YANG DIPILIH)               */
          /* ============================================================== */
          <div className="mt-4">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border mb-2 shadow-2xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedRole === 'admin'
                      ? 'bg-emerald-500'
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

              {/* Pendaftaran Akun untuk User Wilayah & User FE */}
              {selectedRole !== 'admin' && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Belum mempunyai akun {currentRoleInfo?.title}?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegistering(true);
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="font-bold text-[#00873D] dark:text-emerald-400 hover:underline cursor-pointer ml-1 inline-flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5 inline" />
                      <span>Daftar akun di sini</span>
                    </button>
                  </p>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">Memuat...</div>}>
      <LoginContent />
    </Suspense>
  );
}
