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
  BadgeCheck,
} from 'lucide-react';

function LoginContent() {
  // Pilihan Role Login: 'admin' atau 'user'
  const [loginRole, setLoginRole] = useState<'admin' | 'user'>('admin');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // Form States Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form States Registrasi User
  const [regUsername, setRegUsername] = useState('');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // UI States
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [targetUrl, setTargetUrl] = useState<string>('/');

  useEffect(() => {
    const paramCallback = searchParams.get('callbackUrl');
    if (paramCallback && paramCallback !== '/') {
      setTargetUrl(paramCallback);
    } else if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('ggf_active_portal');
      if (stored && stored !== '/') {
        setTargetUrl(stored);
      } else {
        setTargetUrl('/');
      }
    }
  }, [searchParams]);

  // Redirect jika sudah login
  useEffect(() => {
    if (user) {
      router.push(targetUrl);
    }
  }, [user, router, targetUrl]);

  // Handle Submit Login (Admin atau User)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    const cleanUsername = username.trim().toLowerCase();
    const res = await login(cleanUsername, password);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg('Login berhasil! Mengalihkan ke dashboard...');
      setTimeout(() => {
        router.push(targetUrl);
      }, 300);
    } else {
      setErrorMsg(res.message || 'Username atau kata sandi tidak sesuai.');
    }
  };

  // Handle Submit Registrasi User
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

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
      setErrorMsg('Kata sandi wajib diisi (minimal 8 karakter).');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          name: cleanName || cleanUsername,
          password: regPassword,
        }),
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (data.success) {
        setSuccessMsg('Pendaftaran akun berhasil! Mengalihkan ke dashboard...');
        // Simpan sesi dan redirect
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 500);
      } else {
        setErrorMsg(data.message || 'Gagal mendaftarkan akun.');
      }
    } catch {
      setIsSubmitting(false);
      setErrorMsg('Terjadi kesalahan jaringan.');
    }
  };

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
        <div className="absolute inset-0 bg-slate-950/45 dark:bg-slate-950/65 backdrop-blur-[2px]" />
      </div>

      {/* Main Container Card */}
      <div className="relative w-full max-w-[440px] bg-white dark:bg-slate-900 rounded-[28px] sm:rounded-3xl shadow-2xl border border-white/30 dark:border-slate-800 p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Tombol Back ke Portal Asal */}
        <Link
          href={targetUrl}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors mb-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>
            {targetUrl.startsWith('/gorong-gorong')
              ? 'Portal Gorong-Gorong'
              : targetUrl.startsWith('/labita')
              ? 'Portal Labita'
              : 'Portal Utama'}
          </span>
        </Link>

        {/* Top Brand Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-center p-2 shadow-xs mb-3">
            <img
              src="/assets/logo.png"
              alt="GGF Logo"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Kotak Pilihan di Atas: Admin dan User */}
          <div className="w-full grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 mb-5">
            <button
              type="button"
              onClick={() => {
                setLoginRole('admin');
                setIsRegistering(false);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                loginRole === 'admin' && !isRegistering
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <ShieldCheck
                className={`w-4 h-4 ${
                  loginRole === 'admin' && !isRegistering
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400'
                }`}
              />
              <span>Admin</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginRole('user');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                loginRole === 'user'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <UserIcon
                className={`w-4 h-4 ${
                  loginRole === 'user'
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-slate-400'
                }`}
              />
              <span>User</span>
            </button>
          </div>

          {/* Title & Subtitle */}
          {isRegistering ? (
            <>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Daftar Akun Pengguna
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Lengkapi formulir untuk membuat akun monitoring baru
              </p>
            </>
          ) : loginRole === 'admin' ? (
            <>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Login Administrator
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Masuk untuk mengelola data jadwal operasional &amp; analitik
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Login Pengguna
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Masuk untuk melihat jadwal operasional &amp; monitoring
              </p>
            </>
          )}
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

        {/* ================= FORM LOGIN (ADMIN / USER) ================= */}
        {!isRegistering ? (
          <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
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
                  placeholder={loginRole === 'admin' ? 'admin' : 'username'}
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

            {/* Tombol Login Hijau (Gaya Gambar GGF) */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#008f68] hover:bg-[#007b5a] active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-6"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmitting ? 'Memproses...' : 'Login'}</span>
            </button>

            {/* Tautan Belum Punya Akun (Hanya Muncul Jika Pilihan User Aktif) */}
            {loginRole === 'user' && (
              <div className="text-center pt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Belum mempunyai akun?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(true);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="font-bold text-[#008f68] dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Daftar Akun
                  </button>
                </p>
              </div>
            )}
          </form>
        ) : (
          /* ================= FORM PENDAFTARAN USER BARU ================= */
          <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Username <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center w-full px-4 py-3 rounded-2xl bg-[#f0f5ff] dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 focus-within:ring-2 focus-within:ring-[#008f68]/30 focus-within:border-[#008f68] transition-all">
                <span className="text-slate-400 font-mono text-xs mr-2 font-bold">@</span>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  placeholder="username"
                  className="bg-transparent flex-1 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none placeholder:text-slate-400/80"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Digunakan untuk login (huruf kecil &amp; tanpa spasi).</p>
            </div>

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
                  placeholder="Nama lengkap Anda"
                  className="bg-transparent flex-1 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none placeholder:text-slate-400/80"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Kata Sandi <span className="text-rose-500">*</span>
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

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Ulangi Kata Sandi <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center w-full px-4 py-3 rounded-2xl bg-[#f0f5ff] dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 focus-within:ring-2 focus-within:ring-[#008f68]/30 focus-within:border-[#008f68] transition-all">
                <Lock className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi"
                  className="bg-transparent flex-1 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none placeholder:text-slate-400/80"
                />
              </div>
            </div>

            {/* Tombol Daftar */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#008f68] hover:bg-[#007b5a] active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-5"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmitting ? 'Mendaftarkan...' : 'Daftar Akun'}</span>
            </button>

            {/* Tautan Kembali ke Login */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sudah mempunyai akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="font-bold text-[#008f68] dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Login disini
                </button>
              </p>
            </div>
          </form>
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
