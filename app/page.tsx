'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sprout,
  Wrench,
  Factory,
  ArrowRight,
  ShieldCheck,
  Eye,
  LogIn,
  LogOut,
  Sun,
  Moon,
  Sparkles,
  Layers,
  ChevronRight,
  Clock,
  User as UserIcon,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/components/AuthProvider';

export default function PortalLandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="min-h-screen relative flex flex-col justify-between overflow-x-hidden select-none">
      {/* Background Jelas Lahan Nanas 2.jpg */}
      <div className="fixed inset-0 -z-50 pointer-events-none select-none">
        <img
          src="/assets/Lahan Nanas 2.jpg"
          alt="Pemandangan Lahan Nanas GGF"
          className="w-full h-full object-cover object-center filter saturate-105"
        />
        {/* Soft Ambient Overlay untuk Kenyamanan Baca Kartu */}
        <div className="absolute inset-0 bg-black/25 dark:bg-black/50 pointer-events-none transition-colors duration-500" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 via-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Top Navbar Header */}
      <header className="px-6 sm:px-10 py-4 flex items-center justify-between gap-4 z-10 bg-transparent">
        {/* Sisi Kiri: Logo GGF Kotak Putih + Nama Portal */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-white/80 flex items-center justify-center p-1 shadow-md shrink-0">
            <img
              src="/assets/logo.png"
              alt="Great Giant Foods"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-black text-white tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Great Giant Pineapple
            </span>
            <span className="text-[11px] font-medium text-white/85 tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Enterprise Operational Portal
            </span>
          </div>
        </div>

        {/* Sisi Kanan: Theme Toggle & Info Auth */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            aria-label="Toggle Theme"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-white/20 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 hover:text-amber-500 dark:hover:text-amber-400 transition-all cursor-pointer shadow-sm backdrop-blur-sm"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] font-bold hidden sm:inline">Terang</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="text-[11px] font-bold hidden sm:inline">Gelap</span>
              </>
            )}
          </button>

          {/* User Auth Profile / Login Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-white/20 dark:border-slate-700 shadow-sm backdrop-blur-sm">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {isAdmin ? 'Admin (Full Edit)' : 'User (View Only)'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => logout()}
                title="Keluar dari akun"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/90 hover:bg-rose-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer backdrop-blur-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-white text-slate-900 dark:text-white text-xs font-bold border border-white/30 dark:border-slate-700 shadow-sm transition-all backdrop-blur-sm"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Masuk</span>
              </Link>
              <Link
                href="/login?mode=register"
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <span>Daftar</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Header & 3 Main Menu Cards */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 md:px-10 py-10 max-w-7xl mx-auto w-full z-10 text-center">
        {/* Hero Title */}
        <div className="max-w-3xl mx-auto space-y-3 mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 border border-white/30 dark:border-slate-700 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold shadow-sm backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>PORTAL UTAMA OPERASIONAL 2026</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
            Sistem Monitoring &amp; Manajemen Terpadu
          </h1>

          <p className="text-sm sm:text-base text-white/90 max-w-2xl mx-auto font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
            Pilih modul kerja operasional perkebunan nanas dan fasilitas produksi untuk mengakses visualisasi data real-time, jadwal kerja, dan laporan analitik.
          </p>
        </div>

        {/* 3 Kotak Menu: LABITA, PLANT MAINTENANCE, PRODUKSI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 w-full max-w-6xl">
          {/* KOTAK 1: LABITA (Aktif) */}
          <Link
            href="/labita"
            className="group relative rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/80 dark:border-emerald-500/60 p-7 sm:p-8 flex flex-col justify-between text-left shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />

            <div>
              {/* Badge & Icon */}
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  <Sprout className="w-7 h-7" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Modul Aktif
                </span>
              </div>

              {/* Title & Description */}
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                LABITA
              </h2>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mt-0.5">
                Lahan • Bibit • Tanaman
              </span>
              <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 mt-3.5 leading-relaxed">
                Monitoring Schedule 2026: Stok Lahan (BK, BJK, SN), 19 Tahapan Pengolahan Tanah, Real Tanam Nanas (RTN), Monitoring Bibit &amp; Proyeksi Panen.
              </p>
            </div>

            {/* Bottom Button Link */}
            <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-600">
              <span>Buka Dashboard LABITA</span>
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              </div>
            </div>
          </Link>

          {/* KOTAK 2: PLANT MAINTENANCE (Placeholder / Dalam Pengembangan) */}
          <Link
            href="/plant-maintenance"
            className="group relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-7 sm:p-8 flex flex-col justify-between text-left shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden opacity-95 hover:opacity-100"
          >
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-400" />

            <div>
              {/* Badge & Icon */}
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  <Wrench className="w-7 h-7" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  <Clock className="w-3 h-3 text-amber-600" />
                  Dalam Persiapan
                </span>
              </div>

              {/* Title & Description */}
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                PLANT MAINTENANCE
              </h2>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block mt-0.5">
                Perawatan Mesin &amp; Fasilitas
              </span>
              <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 mt-3.5 leading-relaxed">
                Pemeliharaan armada traktor kebun, mesin pengolah tanah, pompa irigasi, serta jadwal inspeksi berkala fasilitas operasional perkebunan.
              </p>
            </div>

            {/* Bottom Button Link */}
            <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400">
              <span>Detail Informasi Modul</span>
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
          </Link>

          {/* KOTAK 3: PRODUKSI (Placeholder / Dalam Pengembangan) */}
          <Link
            href="/produksi"
            className="group relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-7 sm:p-8 flex flex-col justify-between text-left shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden opacity-95 hover:opacity-100"
          >
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-500 to-blue-500" />

            <div>
              {/* Badge & Icon */}
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/15 dark:bg-sky-500/20 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  <Factory className="w-7 h-7" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-300 dark:border-sky-700">
                  <Clock className="w-3 h-3 text-sky-600" />
                  Dalam Persiapan
                </span>
              </div>

              {/* Title & Description */}
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                PRODUKSI
              </h2>
              <span className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider block mt-0.5">
                Pabrik Cannery &amp; Distribusi
              </span>
              <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 mt-3.5 leading-relaxed">
                Manajemen pemrosesan buah nanas di pabrik cannery, kapasitas output harian, kontrol kualitas kaleng nanas, serta distribusi produksi.
              </p>
            </div>

            {/* Bottom Button Link */}
            <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400">
              <span>Detail Informasi Modul</span>
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center z-10 bg-transparent text-white/80 text-xs font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        PT Great Giant Pineapple © 2026 • Enterprise Operational Integrated Portal
      </footer>
    </div>
  );
}
