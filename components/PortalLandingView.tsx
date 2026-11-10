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
import { usePortalAccess } from '@/lib/portalAccess';

interface PortalLandingViewProps {
  onSelectPortal?: (portal: 'labita' | 'gorong_gorong') => void;
}

export default function PortalLandingView({ onSelectPortal }: PortalLandingViewProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, logout } = useAuth();
  const { isLocalhost, canAccessLabita } = usePortalAccess();
  const [showDevModal, setShowDevModal] = useState<boolean>(false);

  return (
    <div
      className="min-h-screen flex flex-col relative text-slate-900 dark:text-slate-100 transition-colors duration-200 bg-cover bg-center bg-no-repeat bg-fixed"
      style={{
        backgroundImage: "url('/assets/Lahan%20Nanas%202.jpg')",
      }}
    >
      {/* Background Overlay for Maximum Contrast & Readability */}
      <div className="absolute inset-0 bg-slate-950/45 dark:bg-slate-950/75 backdrop-blur-[1.5px] pointer-events-none" />

      {/* Content wrapper on top of overlay */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Bar Landing Page */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-white/20 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md sticky top-0 z-40 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1.5 shadow-xs">
              <img
                src="/assets/logo.png"
                alt="Great Giant Foods"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>GREAT GIANT FOODS</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-[#00873D] dark:text-emerald-400 font-bold border border-emerald-500/20">
                  Plantation Group 1
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Sistem Portal Operasional &amp; Monitoring Kebun
              </p>
            </div>
          </div>

          {/* Right Controls: Theme Toggle & User Info */}
          <div className="flex items-center gap-2.5">
            <a
              href="https://estatepg1.online"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer shrink-0"
              title="Kembali ke Halaman Utama estatepg1.online"
              aria-label="Kembali ke Halaman Utama estatepg1.online"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#00873D]" />
              <span>Portal Utama</span>
            </a>

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
              title="Ganti Tema Tampilan"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {user && (
              <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-700">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs ring-1 ring-emerald-500/30">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name || user.email} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    (user.name || user.email || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    {user.name || user.email}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {isAdmin ? 'Administrator' : 'User'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition-all cursor-pointer"
                  title="Keluar / Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Landing Content */}
        <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-10 md:py-16 max-w-6xl w-full mx-auto">
          {/* Hero Section */}
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 border border-emerald-500/30 text-[#00873D] dark:text-emerald-400 text-xs font-bold shadow-sm backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#00873D] animate-pulse" />
              <span>Integrated Agricultural Intelligence Portal</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md leading-tight">
              Pusat Portal Operasional <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 drop-shadow-none">
                Perkebunan PG1
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-100 dark:text-slate-200 font-medium drop-shadow-sm max-w-xl mx-auto">
              Pilih portal kerja yang ingin Anda tuju untuk mengakses dashboard analitik, jadwal kerja, maupun rekapitulasi data lapangan secara terfokus.
            </p>
          </div>

        {/* 2 Big Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full max-w-4xl">
          {/* Card 1: Portal Labita */}
          <Link
            href={canAccessLabita ? '/labita/executive-summary/pengolahan-lahan' : '#'}
            prefetch={false}
            onClick={(e) => {
              if (!canAccessLabita) {
                e.preventDefault();
                setShowDevModal(true);
                return;
              }
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('ggf_active_portal', '/labita/executive-summary/pengolahan-lahan');
              }
              onSelectPortal?.('labita');
            }}
            className={`group relative flex flex-col justify-between p-7 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 ${
              !canAccessLabita
                ? 'border-amber-400/50 dark:border-amber-500/40 hover:border-amber-500 dark:hover:border-amber-400 shadow-md hover:shadow-xl'
                : 'border-slate-200/90 dark:border-slate-800 hover:border-[#00873D] dark:hover:border-emerald-500 shadow-md hover:shadow-2xl'
            } transition-all duration-300 cursor-pointer overflow-hidden text-left`}
          >
            {/* Top accent badge */}
            <div
              className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${
                !canAccessLabita
                  ? 'from-amber-500/20 via-amber-500/5'
                  : 'from-emerald-500/15 via-emerald-500/5'
              } to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500`}
            />

            <div>
              <div className="flex items-center justify-between mb-5">
                <div
                  className={`w-14 h-14 rounded-2xl ${
                    !canAccessLabita
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 group-hover:bg-amber-600 group-hover:text-white'
                      : 'bg-emerald-500/15 text-[#00873D] dark:text-emerald-400 border border-emerald-500/30 group-hover:bg-[#00873D] group-hover:text-white'
                  } flex items-center justify-center transition-all duration-300 shadow-xs group-hover:scale-110`}
                >
                  <Sprout className="w-7 h-7" />
                </div>
                {!canAccessLabita ? (
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600 dark:text-amber-400" />
                    Sedang Dikembangkan
                  </span>
                ) : !isLocalhost && isAdmin ? (
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Akses Admin
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Land Prep &amp; Planting
                  </span>
                )}
              </div>

              <h3
                className={`text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight ${
                  !canAccessLabita
                    ? 'group-hover:text-amber-600 dark:group-hover:text-amber-400'
                    : 'group-hover:text-[#00873D] dark:group-hover:text-emerald-400'
                } transition-colors`}
              >
                Portal Labita
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 leading-relaxed">
                Pemantauan jadwal dan rencana olah tanah, stok bero, mutu olah tanah (DSM), serta pelacakan realisasi penanaman nanas PG1.
              </p>

              {!canAccessLabita && (
                <div className="mt-3.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>Akses publik sementara dinonaktifkan. Khusus dibuka pada localhost atau login Administrator.</span>
                </div>
              )}

              {/* Feature Points */}
              <div className="mt-6 space-y-2.5 pt-5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Executive Summary &amp; Tren Bero Pengolahan Lahan</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>List Stok Lahan &amp; Tabel Induk Data Lahan PG1</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Monitoring Real Tanam Nanas &amp; Input Tanam Petik</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Evaluasi Benchmark Tanam &amp; Sebaran Bibit per Bulan</span>
                </div>
              </div>
            </div>

            {/* Action CTA */}
            {!canAccessLabita ? (
              <div className="mt-8 pt-4 flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400 group-hover:translate-x-1 transition-transform duration-200">
                <span className="text-sm font-extrabold flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> Buka Akses Admin
                </span>
                <div className="w-8 h-8 rounded-full bg-amber-500/15 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ) : (
              <div className="mt-8 pt-4 flex items-center justify-between text-xs font-bold text-[#00873D] dark:text-emerald-400 group-hover:translate-x-1 transition-transform duration-200">
                <span className="text-sm font-extrabold">Buka Portal Labita</span>
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 group-hover:bg-[#00873D] group-hover:text-white flex items-center justify-center transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            )}
          </Link>

          {/* Card 2: Portal Monitor Gorong-Gorong */}
          <Link
            href={user ? '/gorong-gorong/monitor-gorong-gorong' : '/login?callbackUrl=/gorong-gorong/monitor-gorong-gorong'}
            prefetch={false}
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('ggf_active_portal', '/gorong-gorong/monitor-gorong-gorong');
              }
              if (user) {
                onSelectPortal?.('gorong_gorong');
              }
            }}
            className="group relative flex flex-col justify-between p-7 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden text-left"
          >
            {/* Top accent badge */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/15 via-blue-500/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500" />

            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/30 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-xs">
                  <Layers className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  Drainage &amp; Materials
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Portal Monitor Gorong-Gorong
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 leading-relaxed">
                Pusat pengawasan rekapitulasi order, kedatangan (dropping) serta kontrol saldo fisik gorong-gorong.
              </p>

              {/* Feature Points */}
              <div className="mt-6 space-y-2.5 pt-5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Monitoring Saldo &amp; Kebutuhan Gorong-Gorong 4 Diameter</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Daftar Lokasi Belum Order &amp; Ringkasan Kebutuhan Wilayah</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Formulir &amp; Rekapitulasi Order Wilayah Lapangan</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Master Data Digital: Status Lokasi, Waterlogging &amp; Upload SAP</span>
                </div>
              </div>
            </div>

            {/* Action CTA */}
            <div className="mt-8 pt-4 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform duration-200">
              <span className="text-sm font-extrabold">Buka Portal Gorong-Gorong</span>
              <div className="w-8 h-8 rounded-full bg-blue-500/10 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </div>

        {/* Modal Info Under Development (Khusus Pengunjung Online Non-Admin) */}
        {showDevModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-amber-500/30 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowDevModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                    Portal Labita Dalam Pengembangan
                  </h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                    Under Development &amp; Calibration
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  Modul <strong>Portal Labita (Pengolahan Lahan, Stok Bero, &amp; Tanam Nanas)</strong> saat ini sedang dalam proses penyempurnaan fitur dan kalibrasi data, sehingga untuk sementara akses publik dinonaktifkan.
                </p>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Ketentuan Akses:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pl-1">
                    <li><strong>Localhost:</strong> Terbuka penuh untuk pengujian &amp; development.</li>
                    <li><strong>Domain Publik:</strong> Khusus dapat dibuka oleh Administrator.</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <Link
                  href="/login?role=admin&callbackUrl=/labita/executive-summary/pengolahan-lahan"
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold text-center transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Login Administrator</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowDevModal(false)}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-12 text-center text-xs text-slate-300 dark:text-slate-400 drop-shadow-sm">
          <p>© 2026 PT Great Giant Pineapple • Plantation Group 1 (PG1). Hak cipta dilindungi.</p>
        </div>
      </main>
      </div>
    </div>
  );
}
