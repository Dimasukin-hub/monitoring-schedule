'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogIn,
} from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, isAdmin, isSuperAdmin, isManagement, isKepalaWilayah } = useAuth();

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
  }, [searchParams]);

  // Redirect jika sudah login dan berhak mengakses targetUrl
  useEffect(() => {
    if (user) {
      let finalTarget = targetUrl;
      const isLabitaTarget = finalTarget.startsWith('/labita');
      const isSulamTarget = finalTarget.startsWith('/sulam');
      if ((isLabitaTarget || isSulamTarget) && !isSuperAdmin) {
        setErrorMsg('Akses ditolak. Modul ini khusus untuk Super Administrator.');
        return;
      }

      const canSeeMonitor = isSuperAdmin || isAdmin || isManagement || isKepalaWilayah;
      if (!canSeeMonitor && (finalTarget === '/gorong-gorong/monitor-gorong-gorong' || finalTarget === '/gorong-gorong')) {
        finalTarget = '/gorong-gorong/form-input/order-gorong-gorong';
      }
      router.push(finalTarget);
    }
  }, [user, isAdmin, isSuperAdmin, isManagement, isKepalaWilayah, router, targetUrl]);

  // Handle Submit Login Langsung
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    const cleanUsername = username.trim().toLowerCase();
    const res = await login(cleanUsername, password);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg('Login berhasil! Mengalihkan ke sistem...');
      setTimeout(() => {
        router.push(targetUrl);
      }, 350);
    } else {
      setErrorMsg(res.message || 'Username atau kata sandi tidak sesuai.');
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-y-auto select-none py-10 sm:py-12">
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

      {/* Main Container Card: Langsung Tampilan Login Bersih */}
      <div className="relative w-full max-w-[440px] bg-white dark:bg-slate-900 rounded-[24px] sm:rounded-3xl shadow-2xl border border-white/30 dark:border-slate-800 p-6 sm:p-8 transition-all duration-300 animate-in fade-in zoom-in-95 my-auto">
        {/* Tombol Back ke Portal Utama */}
        <div className="flex items-center justify-between mb-4">
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
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-center p-2 shadow-xs mb-2.5">
            <img
              src="/assets/logo.png"
              alt="GGF Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <h2 className="text-[11px] sm:text-xs font-black tracking-wider uppercase text-emerald-700 dark:text-emerald-400">
            Plantation Group 1 • Great Giant Foods
          </h2>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
            Masuk ke Sistem
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Masukkan username dan kata sandi Anda untuk melanjutkan
          </p>
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

        {/* Form Login Universal */}
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
                placeholder="Masukkan username"
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
                tabIndex={-1}
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
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>{isSubmitting ? 'Memproses...' : 'Login'}</span>
          </button>
        </form>
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
