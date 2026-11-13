'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sprout,
  Layers,
  ArrowRight,
  ShieldCheck,
  User as UserIcon,
  Sun,
  Moon,
  LogOut,
  Calendar,
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  MapPin,
  Tractor,
  Lock,
  Clock,
  X,
  AlertCircle,
  LayoutGrid,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/components/AuthProvider';

interface PortalLandingViewProps {
  onSelectPortal?: (portal: 'labita' | 'gorong_gorong') => void;
}

export default function PortalLandingView({ onSelectPortal }: PortalLandingViewProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, logout } = useAuth();

  return (
    <div
      className="min-h-screen flex flex-col relative text-slate-900 dark:text-slate-100 transition-colors duration-200 bg-cover bg-center bg-no-repeat bg-fixed w-full max-w-full overflow-x-hidden"
      style={{
        backgroundImage: "url('/assets/Lahan%20Nanas%202.jpg')",
      }}
    >
      {/* Background Overlay for Maximum Contrast & Readability */}
      <div className="absolute inset-0 bg-slate-950/45 dark:bg-slate-950/75 backdrop-blur-[1.5px] pointer-events-none" />

      {/* Content wrapper on top of overlay */}
      <div className="relative z-10 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        {/* Top Bar Landing Page */}
        <header className="px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between border-b border-white/20 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md sticky top-0 z-40 shadow-xs w-full max-w-full">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl overflow-hidden bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 sm:p-1.5 shadow-xs shrink-0">
              <img
                src="/assets/logo.png"
                alt="Great Giant Foods"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1 sm:gap-1.5 truncate">
                <span className="truncate">GREAT GIANT FOODS</span>
                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full bg-emerald-500/10 text-[#00873D] dark:text-emerald-400 font-bold border border-emerald-500/20 shrink-0">
                  PG1
                </span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                Sistem Portal Operasional &amp; Monitoring Kebun
              </p>
            </div>
          </div>

          {/* Right Controls: Theme Toggle & User Info */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <a
              href="https://estatepg1.online"
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-white/90 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px] sm:text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer shrink-0"
              title="Kembali ke Halaman Utama estatepg1.online"
              aria-label="Kembali ke Halaman Utama estatepg1.online"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#00873D]" />
              <span className="hidden sm:inline">Portal Utama</span>
              <span className="sm:hidden text-[10px]">Portal</span>
            </a>

            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
              title="Ganti Tema Tampilan"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />}
            </button>

            {user && (
              <div className="flex items-center gap-1.5 sm:gap-2.5 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-700">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs ring-1 ring-emerald-500/30 shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name || user.email} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    (user.name || user.email || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden md:block text-left max-w-[120px] truncate">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight truncate">
                    {user.name || user.email}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {isAdmin ? 'Administrator' : 'User'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 sm:p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition-all cursor-pointer"
                  title="Keluar / Logout"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Landing Content */}
        <main className="flex-1 flex flex-col justify-center items-center px-3 sm:px-6 py-6 sm:py-12 md:py-16 max-w-6xl w-full mx-auto">
          {/* Hero Section */}
          <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-10 md:mb-14 space-y-2 sm:space-y-3">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 border border-emerald-500/30 text-[#00873D] dark:text-emerald-400 text-[11px] sm:text-xs font-bold shadow-sm backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#00873D] animate-pulse" />
              <span>Integrated Agricultural Intelligence Portal</span>
            </div>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-md leading-tight break-words">
              Pusat Portal Operasional <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 drop-shadow-none">
                Perkebunan PG1
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-100 dark:text-slate-200 font-medium drop-shadow-sm max-w-xl mx-auto break-words leading-relaxed px-1">
              Pilih portal kerja yang ingin Anda tuju untuk mengakses dashboard analitik, jadwal kerja, maupun rekapitulasi data lapangan secara terfokus.
            </p>
          </div>

        {/* 2 Big Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 w-full max-w-4xl">
          {/* Card 1: Portal Labita */}
          <Link
            href={
              user && isAdmin
                ? '/labita/executive-summary/pengolahan-lahan'
                : '/login?role=admin&callbackUrl=/labita/executive-summary/pengolahan-lahan'
            }
            prefetch={false}
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('ggf_active_portal', '/labita/executive-summary/pengolahan-lahan');
              }
              if (user && isAdmin) {
                onSelectPortal?.('labita');
              }
            }}
            className="group relative flex flex-col justify-between p-4 sm:p-7 md:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 hover:border-[#00873D] dark:hover:border-emerald-500 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden text-left"
          >
            {/* Top accent badge */}
            <div className="absolute top-0 right-0 w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-bl from-emerald-500/15 via-emerald-500/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500" />

            <div>
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-500/15 text-[#00873D] dark:text-emerald-400 border border-emerald-500/30 group-hover:bg-[#00873D] group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-xs group-hover:scale-110 shrink-0">
                  <Sprout className="w-5 h-5 sm:w-7 sm:h-7" />
                </div>
                {user && isAdmin ? (
                  <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs">
                    <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    Akses Admin Aktif
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5 shadow-2xs">
                    <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Khusus Admin
                  </span>
                )}
              </div>

              <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-[#00873D] dark:group-hover:text-emerald-400 transition-colors">
                Portal Labita
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 leading-relaxed break-words">
                Pemantauan jadwal dan rencana olah tanah, stok bero, mutu olah tanah (DSM), serta pelacakan realisasi penanaman nanas PG1.
              </p>

              {!(user && isAdmin) && (
                <div className="mt-3 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2 text-[11px] sm:text-xs text-emerald-800 dark:text-emerald-300 leading-snug">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Akses khusus Administrator. Klik untuk masuk menggunakan akun Admin.</span>
                </div>
              )}

              {/* Feature Points */}
              <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-2.5 pt-4 sm:pt-5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-semibold leading-snug">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="break-words">Executive Summary &amp; Tren Bero Pengolahan Lahan</span>
                </div>
                <div className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-semibold leading-snug">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="break-words">List Stok Lahan &amp; Tabel Induk Data Lahan PG1</span>
                </div>
                <div className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-semibold leading-snug">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="break-words">Monitoring Real Tanam Nanas &amp; Input Tanam Petik</span>
                </div>
                <div className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-semibold leading-snug">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="break-words">Evaluasi Benchmark Tanam &amp; Sebaran Bibit per Bulan</span>
                </div>
              </div>
            </div>

            {/* Action CTA */}
            {user && isAdmin ? (
              <div className="mt-6 sm:mt-8 pt-3 sm:pt-4 flex items-center justify-between text-xs font-bold text-[#00873D] dark:text-emerald-400 group-hover:translate-x-1 transition-transform duration-200">
                <span className="text-xs sm:text-sm font-extrabold">Buka Portal Labita</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500/10 group-hover:bg-[#00873D] group-hover:text-white flex items-center justify-center transition-colors">
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
            ) : (
              <div className="mt-6 sm:mt-8 pt-3 sm:pt-4 flex items-center justify-between text-xs font-bold text-[#00873D] dark:text-emerald-400 group-hover:translate-x-1 transition-transform duration-200">
                <span className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Login Admin &amp; Masuk
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500/10 group-hover:bg-[#00873D] group-hover:text-white flex items-center justify-center transition-colors">
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
            )}
          </Link>

          {/* Card 2: Portal Monitor Gorong-Gorong */}
          <Link
            href={
              user
                ? isAdmin
                  ? '/gorong-gorong/monitor-gorong-gorong'
                  : '/gorong-gorong/form-input/order-gorong-gorong'
                : '/login?callbackUrl=/gorong-gorong'
            }
            prefetch={false}
            onClick={() => {
              const target = user
                ? isAdmin
                  ? '/gorong-gorong/monitor-gorong-gorong'
                  : '/gorong-gorong/form-input/order-gorong-gorong'
                : '/gorong-gorong';
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('ggf_active_portal', target);
              }
              if (user) {
                onSelectPortal?.('gorong_gorong');
              }
            }}
            className="group relative flex flex-col justify-between p-4 sm:p-7 md:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden text-left"
          >
            {/* Top accent badge */}
            <div className="absolute top-0 right-0 w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-bl from-blue-500/15 via-blue-500/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500" />

            <div>
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/30 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-xs shrink-0">
                  <Layers className="w-5 h-5 sm:w-7 sm:h-7" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  Drainage &amp; Materials
                </span>
              </div>

              <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Portal Gorong-Gorong
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 leading-relaxed break-words">
                Pusat pengawasan rekapitulasi order, kedatangan (dropping) serta kontrol saldo fisik gorong-gorong.
              </p>

              {/* Feature Points */}
              <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-2.5 pt-4 sm:pt-5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-semibold leading-snug">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span className="break-words">Monitoring Saldo &amp; Kebutuhan Gorong-Gorong 4 Diameter</span>
                </div>
                <div className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-semibold leading-snug">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span className="break-words">Daftar Lokasi Belum Order &amp; Ringkasan Kebutuhan Wilayah</span>
                </div>
                <div className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-semibold leading-snug">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span className="break-words">Formulir &amp; Rekapitulasi Order Wilayah Lapangan</span>
                </div>
                <div className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-semibold leading-snug">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span className="break-words">Master Data Digital: Status Lokasi, Waterlogging &amp; Upload SAP</span>
                </div>
              </div>
            </div>

            {/* Action CTA */}
            <div className="mt-6 sm:mt-8 pt-3 sm:pt-4 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform duration-200">
              <span className="text-xs sm:text-sm font-extrabold">Buka Portal Gorong-Gorong</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-500/10 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
          </Link>
        </div>

        {/* Footer info */}
        <div className="mt-8 sm:mt-12 text-center text-[11px] sm:text-xs text-slate-300 dark:text-slate-400 drop-shadow-sm px-2">
          <p>© 2026 PT Great Giant Pineapple • Plantation Group 1 (PG1). Hak cipta dilindungi.</p>
        </div>
      </main>
      </div>
    </div>
  );
}
