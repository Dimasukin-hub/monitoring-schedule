'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Boxes,
  Tractor,
  Sprout,
  Wheat,
  BarChart3,
  Menu,
  ChevronRight,
  CalendarCheck,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalLands?: number;
  isOpen?: boolean;
  onToggle?: () => void;
}

type GgfTheme = 'green' | 'orange' | 'blue' | 'leaf';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  colorTheme: GgfTheme;
  badge?: string;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  totalLands = 0,
  isOpen = true,
  onToggle,
}: SidebarProps) {
  const menuItems: MenuItem[] = [
    {
      id: 'executive_summary',
      label: 'Executive Summary',
      icon: LayoutDashboard,
      desc: 'Ringkasan KPI & Visualisasi',
      colorTheme: 'green',
    },
    {
      id: 'pengolahan_lahan_bibit_tanam',
      label: 'Pengolahan Lahan Bibit Tanam',
      icon: Tractor,
      desc: 'Rencana vs Real, Bero, Stok, Lahan',
      colorTheme: 'leaf',
    },
    {
      id: 'planting',
      label: 'Planting',
      icon: CalendarCheck,
      desc: 'Real Tanam Nanas & Proses Tanam',
      colorTheme: 'green',
    },
  ];

  // Helper styles based on GGF Color Themes (Green, Orange, Blue, Leaf)
  const getThemeStyles = (theme: GgfTheme, isActive: boolean) => {
    switch (theme) {
      case 'orange':
        return {
          activeBg:
            'bg-gradient-to-r from-[#F58220]/15 via-[#F58220]/8 to-transparent dark:from-[#F58220]/25 dark:via-[#F58220]/10 dark:to-transparent',
          activeBorder: 'border-[#F58220]/40 dark:border-[#F58220]/50 shadow-[0_2px_12px_-2px_rgba(245,130,32,0.2)]',
          activeText: 'text-[#D96E14] dark:text-amber-300 font-bold',
          activeIcon: 'text-[#F58220] dark:text-amber-400',
          iconContainerActive: 'bg-[#F58220]/15 dark:bg-[#F58220]/25 ring-1 ring-[#F58220]/40 text-[#F58220]',
          hoverIcon: 'group-hover:text-[#F58220] dark:group-hover:text-amber-400',
          hoverIconContainer: 'group-hover:bg-[#F58220]/10 dark:group-hover:bg-[#F58220]/20 group-hover:ring-[#F58220]/30',
          accentBar: 'bg-[#F58220]',
          badgeColor: 'bg-[#F58220]/15 text-[#D96E14] dark:text-amber-300 border-[#F58220]/30',
          dot: 'bg-[#F58220]',
        };
      case 'blue':
        return {
          activeBg:
            'bg-gradient-to-r from-[#009EE2]/15 via-[#009EE2]/8 to-transparent dark:from-[#009EE2]/25 dark:via-[#009EE2]/10 dark:to-transparent',
          activeBorder: 'border-[#009EE2]/40 dark:border-[#009EE2]/50 shadow-[0_2px_12px_-2px_rgba(0,158,226,0.2)]',
          activeText: 'text-[#007cb3] dark:text-sky-300 font-bold',
          activeIcon: 'text-[#009EE2] dark:text-sky-400',
          iconContainerActive: 'bg-[#009EE2]/15 dark:bg-[#009EE2]/25 ring-1 ring-[#009EE2]/40 text-[#009EE2]',
          hoverIcon: 'group-hover:text-[#009EE2] dark:group-hover:text-sky-400',
          hoverIconContainer: 'group-hover:bg-[#009EE2]/10 dark:group-hover:bg-[#009EE2]/20 group-hover:ring-[#009EE2]/30',
          accentBar: 'bg-[#009EE2]',
          badgeColor: 'bg-[#009EE2]/15 text-[#007cb3] dark:text-sky-300 border-[#009EE2]/30',
          dot: 'bg-[#009EE2]',
        };
      case 'leaf':
        return {
          activeBg:
            'bg-gradient-to-r from-[#84BD00]/15 via-[#84BD00]/8 to-transparent dark:from-[#84BD00]/25 dark:via-[#84BD00]/10 dark:to-transparent',
          activeBorder: 'border-[#84BD00]/40 dark:border-[#84BD00]/50 shadow-[0_2px_12px_-2px_rgba(132,189,0,0.2)]',
          activeText: 'text-[#5d8500] dark:text-lime-300 font-bold',
          activeIcon: 'text-[#84BD00] dark:text-lime-400',
          iconContainerActive: 'bg-[#84BD00]/15 dark:bg-[#84BD00]/25 ring-1 ring-[#84BD00]/40 text-[#84BD00]',
          hoverIcon: 'group-hover:text-[#84BD00] dark:group-hover:text-lime-400',
          hoverIconContainer: 'group-hover:bg-[#84BD00]/10 dark:group-hover:bg-[#84BD00]/20 group-hover:ring-[#84BD00]/30',
          accentBar: 'bg-[#84BD00]',
          badgeColor: 'bg-[#84BD00]/15 text-[#5d8500] dark:text-lime-300 border-[#84BD00]/30',
          dot: 'bg-[#84BD00]',
        };
      case 'green':
      default:
        return {
          activeBg:
            'bg-gradient-to-r from-[#00873D]/15 via-[#00873D]/8 to-transparent dark:from-[#00873D]/25 dark:via-[#00873D]/10 dark:to-transparent',
          activeBorder: 'border-[#00873D]/40 dark:border-[#00873D]/50 shadow-[0_2px_12px_-2px_rgba(0,135,61,0.2)]',
          activeText: 'text-[#00682E] dark:text-emerald-300 font-bold',
          activeIcon: 'text-[#00873D] dark:text-emerald-400',
          iconContainerActive: 'bg-[#00873D]/15 dark:bg-[#00873D]/25 ring-1 ring-[#00873D]/40 text-[#00873D]',
          hoverIcon: 'group-hover:text-[#00873D] dark:group-hover:text-emerald-400',
          hoverIconContainer: 'group-hover:bg-[#00873D]/10 dark:group-hover:bg-[#00873D]/20 group-hover:ring-[#00873D]/30',
          accentBar: 'bg-[#00873D]',
          badgeColor: 'bg-[#00873D]/15 text-[#00682E] dark:text-emerald-300 border-[#00873D]/30',
          dot: 'bg-[#00873D]',
        };
    }
  };

  return (
    <aside
      className={`${
        isOpen ? 'w-[296px]' : 'w-[74px]'
      } relative overflow-hidden border-r border-slate-200/90 dark:border-white/10 shadow-[3px_0_20px_-5px_rgba(0,135,61,0.06)] dark:shadow-[3px_0_25px_-5px_rgba(0,0,0,0.6)] flex flex-col shrink-0 h-screen sticky top-0 z-40 backdrop-blur-xl transition-all duration-300 ease-in-out select-none`}
    >
      {/* 1. GGF Tricolor Signature Gradient Bar (Green - Orange - Blue) */}
      <div className="h-[3.5px] w-full bg-gradient-to-r from-[#00873D] via-[#F58220] to-[#009EE2] shrink-0 z-20" />

      {/* 2. Full-Sidebar Lahan Nanas Image & Semi-Transparent Image Overlay - Menyatu dari header hingga footer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        {/* Full Lahan Nanas Background Image */}
        <img
          src="/assets/Lahan Nanas.jpg"
          alt="Lahan Nanas Background"
          className="w-full h-full object-cover object-top filter saturate-110 contrast-105"
        />
        {/* Semi-transparent Image Overlay: ensures the pineapple field is visibly integrated across the entire sidebar while maintaining high contrast & readability */}
        <div className="absolute inset-0 bg-white/75 dark:bg-slate-950/80 backdrop-blur-[1px]" />
        
        {/* Subtle Ambient Brand Gradient Radiance */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#00873D]/10 via-transparent to-[#009EE2]/8 dark:from-[#00873D]/20 dark:via-transparent dark:to-[#009EE2]/15" />
      </div>

      {/* Brand Header - Height h-[128px] aligned exactly with Header, bg-transparent agar gambar nanas menyatu */}
      <div
        className={`h-[128px] border-b border-slate-200/80 dark:border-white/10 bg-transparent flex shrink-0 z-10 ${
          isOpen ? 'pl-3.5 pr-2.5 items-center justify-between gap-3' : 'px-2.5 pt-3.5 pb-2.5 flex-col justify-start gap-2 items-center'
        }`}
      >
        {isOpen ? (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Logo Card with GGF tricolor ring accent */}
              <div className="relative group shrink-0">
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-tr from-[#00873D] via-[#F58220] to-[#009EE2] opacity-40 group-hover:opacity-75 blur-xs transition duration-300" />
                <div className="relative w-10 h-10 rounded-[14px] overflow-hidden bg-white/95 dark:bg-slate-900 border border-white/60 dark:border-slate-700/60 flex items-center justify-center p-1 shadow-sm backdrop-blur-sm">
                  <img
                    src="/assets/logo.png"
                    alt="Great Giant Foods"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div className="min-w-0">
                {/* GGF Badge with 3 brand color dots */}
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-2xs backdrop-blur-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00873D] shadow-[0_0_4px_#00873D]" title="GGF Green" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F58220] shadow-[0_0_4px_#F58220]" title="GGF Orange" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#009EE2] shadow-[0_0_4px_#009EE2]" title="GGF Blue" />
                  </div>
                  <span className="text-[10px] font-black tracking-wider text-slate-800 dark:text-slate-200 uppercase">
                    Estate PG 1
                  </span>
                </div>

                <h1 className="font-bold text-slate-900 dark:text-slate-100 text-[12px] tracking-tight leading-tight whitespace-nowrap mt-1 flex items-center gap-1">
                  <span>Monitoring Schedule</span>
                  <span className="bg-gradient-to-r from-[#00873D] via-[#F58220] to-[#009EE2] bg-clip-text text-transparent font-extrabold">
                    2026
                  </span>
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  PT Great Giant Pineapple
                </p>
              </div>
            </div>

            {/* Tombol Garis Tiga (Tutup Sidebar) - digeser posisinya ke samping dengan ml-auto & pr-2.5 agar tidak berdempetan */}
            {onToggle && (
              <button
                type="button"
                onClick={onToggle}
                className="w-9 h-9 rounded-xl bg-white/85 hover:bg-[#00873D]/15 dark:bg-slate-800/85 dark:hover:bg-[#00873D]/25 text-slate-700 hover:text-[#00873D] dark:text-slate-200 dark:hover:text-emerald-300 transition-all duration-200 cursor-pointer border border-slate-200/90 dark:border-slate-700/70 shrink-0 shadow-2xs hover:shadow-xs backdrop-blur-sm flex items-center justify-center group ml-auto"
                title="Tutup Sidebar"
                aria-label="Tutup Sidebar"
              >
                <Menu className="w-5 h-5 stroke-[2.2] group-hover:scale-105 transition-transform" />
              </button>
            )}
          </>
        ) : (
          <>
            {/* Tombol Garis Tiga saat sidebar tertutup (Buka Sidebar) - Berukuran sama seperti kotak menu di bawahnya dan agak dikebawahin */}
            {onToggle && (
              <button
                type="button"
                onClick={onToggle}
                className="w-full h-[48px] rounded-xl flex items-center justify-center cursor-pointer border border-white/50 dark:border-white/5 bg-white/60 dark:bg-slate-900/60 hover:bg-white/90 dark:hover:bg-slate-800/85 hover:border-emerald-500/40 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 shadow-2xs hover:shadow-xs transition-all duration-200 group backdrop-blur-xs shrink-0"
                title="Buka Sidebar"
                aria-label="Buka Sidebar"
              >
                <div className="w-8.5 h-8.5 rounded-lg flex items-center justify-center bg-white/80 dark:bg-slate-800/80 text-emerald-700 dark:text-emerald-400 ring-1 ring-slate-200/60 dark:ring-slate-700/60 group-hover:ring-emerald-500/40 group-hover:bg-emerald-500/10 transition-all">
                  <Menu className="w-5 h-5 stroke-[2.2] group-hover:scale-110 transition-transform" />
                </div>
              </button>
            )}

            {/* Kotak Logo GGF saat sidebar tertutup - Berukuran sama seperti kotak menu di bawahnya */}
            <div className="w-full h-[48px] rounded-xl flex items-center justify-center border border-white/50 dark:border-white/5 bg-white/60 dark:bg-slate-900/60 shadow-2xs backdrop-blur-xs group shrink-0 relative">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white/95 dark:bg-slate-900/95 ring-1 ring-slate-200/60 dark:ring-slate-700/60 flex items-center justify-center p-1 shadow-2xs group-hover:ring-emerald-500/40 transition-all">
                <img
                  src="/assets/logo.png"
                  alt="Monitoring Schedule 2026"
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation List - dinaikkan ke atas (pt-2.5) dan kotak menu luas proporsional dengan px-3.5 */}
      <nav className={`flex-1 ${isOpen ? 'px-3.5' : 'px-2.5'} pt-2.5 pb-3 space-y-1.5 overflow-y-auto z-10`}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const styles = getThemeStyles(item.colorTheme, isActive);

          return (
            <div key={item.id} className="relative group">
              <button
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center ${
                  isOpen ? 'justify-between px-3 py-2.5' : 'justify-center p-2.5'
                } rounded-xl text-left transition-all duration-200 relative cursor-pointer border ${
                  isActive
                    ? `${styles.activeBg} ${styles.activeBorder} ${styles.activeText} shadow-xs backdrop-blur-md`
                    : 'border-white/50 dark:border-white/5 bg-white/55 dark:bg-slate-900/60 hover:bg-white/90 dark:hover:bg-slate-800/85 hover:border-slate-300/80 dark:hover:border-slate-700/60 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white shadow-2xs hover:shadow-xs backdrop-blur-xs'
                }`}
              >
                {/* Left Active Glow Pill */}
                {isActive && (
                  <span
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full ${styles.accentBar} shadow-[0_0_8px_currentColor]`}
                  />
                )}

                <div className={`flex items-center ${isOpen ? 'gap-2.5 min-w-0' : 'justify-center'}`}>
                  {/* Icon Card with Glassmorphic Accent */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
                      isActive
                        ? styles.iconContainerActive
                        : `bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 ring-1 ring-slate-200/60 dark:ring-slate-700/60 ${styles.hoverIcon} ${styles.hoverIconContainer}`
                    }`}
                  >
                    <Icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-105" />
                  </div>

                  {isOpen && (
                    <div className="truncate min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[12px] block truncate ${isActive ? 'font-bold' : 'font-bold text-slate-900 dark:text-slate-100'}`}>
                          {item.label}
                        </span>
                      </div>
                      <span className="text-[10.5px] text-slate-600 dark:text-slate-400 block truncate leading-tight mt-0.5 font-medium">
                        {item.desc}
                      </span>
                    </div>
                  )}
                </div>

                {isOpen && (
                  <div className="flex items-center gap-1 shrink-0 ml-1.5">
                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${styles.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-all duration-200 ${
                        isActive
                          ? `${styles.activeIcon} translate-x-0.5 opacity-100`
                          : 'text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'
                      }`}
                    />
                  </div>
                )}
              </button>

              {/* Floating Tooltip when Sidebar is Collapsed */}
              {!isOpen && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
                  <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white px-3 py-2 rounded-xl shadow-2xl border border-slate-700/80 backdrop-blur-md min-w-[170px] ring-1 ring-black/10">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
                      <p className="text-xs font-bold text-slate-100">{item.label}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">{item.desc}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
