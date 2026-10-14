'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Sun, Moon, LogOut, ShieldCheck, Eye, ChevronDown, User, UserCog } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/components/AuthProvider';
import EditProfileModal from './EditProfileModal';

export interface MainMenuItem {
  id: string;
  label: string;
}

export const MAIN_MENU_ITEMS: MainMenuItem[] = [
  { id: 'executive_summary', label: 'Executive Summary' },
  { id: 'pengolahan_lahan_bibit_tanam', label: 'Pengolahan Lahan Bibit Tanam' },
  { id: 'planting', label: 'Planting' },
];

export interface SubMenuItem {
  id: string;
  label: string;
}

export const PENGOLAHAN_SUB_MENUS: SubMenuItem[] = [
  { id: 'rencana_realisasi', label: 'Rencana vs Realisasi' },
  { id: 'rerata_bero_tanam', label: 'Rerata Bero dan Tanam' },
  { id: 'list_stok_lahan', label: 'List Stok Lahan' },
  { id: 'data_lahan', label: 'Data Lahan' },
];

export const PLANTING_SUB_MENUS: SubMenuItem[] = [
  { id: 'real_tanam_nanas', label: 'Real Tanam Nanas' },
  { id: 'proses_selesai_tanam', label: 'Proses Tanam & Selesai Tanam' },
];

// Fallback alias
export const OVERVIEW_SUB_MENUS = PENGOLAHAN_SUB_MENUS;

export interface MenuThemeConfig {
  activeText: string;
  activeLine: string;
  hoverText: string;
  hoverLine: string;
  subActiveText: string;
  subActiveLine: string;
  subHoverText: string;
}

export const MENU_THEMES: Record<string, MenuThemeConfig> = {
  executive_summary: {
    activeText: 'text-emerald-700 dark:text-emerald-300',
    activeLine: 'bg-emerald-600 dark:bg-emerald-400',
    hoverText: 'hover:text-emerald-600 dark:hover:text-emerald-300',
    hoverLine: 'bg-emerald-500/40',
    subActiveText: 'text-emerald-700 dark:text-emerald-300',
    subActiveLine: 'bg-emerald-600 dark:bg-emerald-400',
    subHoverText: 'hover:text-emerald-600 dark:hover:text-emerald-300',
  },
  pengolahan_lahan_bibit_tanam: {
    activeText: 'text-teal-700 dark:text-teal-300',
    activeLine: 'bg-teal-600 dark:bg-teal-400',
    hoverText: 'hover:text-teal-600 dark:hover:text-teal-300',
    hoverLine: 'bg-teal-500/40',
    subActiveText: 'text-teal-700 dark:text-teal-300',
    subActiveLine: 'bg-teal-600 dark:bg-teal-400',
    subHoverText: 'hover:text-teal-600 dark:hover:text-teal-300',
  },
  planting: {
    activeText: 'text-emerald-700 dark:text-emerald-200',
    activeLine: 'bg-emerald-500 dark:bg-emerald-300',
    hoverText: 'hover:text-emerald-600 dark:hover:text-emerald-200',
    hoverLine: 'bg-emerald-400/40',
    subActiveText: 'text-emerald-700 dark:text-emerald-200',
    subActiveLine: 'bg-emerald-500 dark:bg-emerald-300',
    subHoverText: 'hover:text-emerald-600 dark:hover:text-emerald-200',
  },
};

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeTabTitle?: string;
  selectedWilayah?: string;
  setSelectedWilayah?: (wilayah: string) => void;
  availableWilayahs?: string[];
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  pengolahanSubTab?: string;
  setPengolahanSubTab?: (subTab: string) => void;
  overviewSubTab?: string;
  setOverviewSubTab?: (subTab: string) => void;
  plantingSubTab?: string;
  setPlantingSubTab?: (subTab: string) => void;
  totalLands?: number;
}

export default function Header({
  activeTab,
  setActiveTab,
  pengolahanSubTab,
  setPengolahanSubTab,
  overviewSubTab,
  setOverviewSubTab,
  plantingSubTab,
  setPlantingSubTab,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, logout, setUserDirectly } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const currentSubTab = pengolahanSubTab || overviewSubTab || 'rencana_realisasi';
  const handleSetSubTab = setPengolahanSubTab || setOverviewSubTab;
  const currentTheme = MENU_THEMES[activeTab] || MENU_THEMES.executive_summary;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isProfileOpen]);

  return (
    <header className="flex flex-col shrink-0 select-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200 shadow-2xs">
      {/* Header Paling Atas (Row 1): Logo GGF, Menu Utama, Theme Toggle & Menu Profil Terpadu */}
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Sisi Kiri: Logo GGF Kotak Putih */}
        <div className="flex items-center shrink-0">
          <Link
            href="/"
            title="Ke Portal Halaman Depan"
            className="w-9 h-9 rounded-xl overflow-hidden bg-white border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-center p-1 shadow-xs hover:ring-2 hover:ring-emerald-400/40 transition-all cursor-pointer"
          >
            <img
              src="/assets/logo.png"
              alt="Great Giant Foods"
              className="w-full h-full object-contain"
            />
          </Link>
        </div>

        {/* Sisi Tengah: Menu Utama (3 Menu: Executive Summary, Pengolahan Lahan Bibit Tanam, Planting) */}
        <nav className="flex-1 flex items-center justify-center gap-5 sm:gap-7 md:gap-9 lg:gap-11 overflow-x-auto no-scrollbar scroll-smooth px-2">
          {MAIN_MENU_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const itemTheme = MENU_THEMES[item.id] || MENU_THEMES.executive_summary;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'pengolahan_lahan_bibit_tanam' && handleSetSubTab && !currentSubTab) {
                    handleSetSubTab('rencana_realisasi');
                  }
                }}
                className={`relative py-2 px-1 text-xs sm:text-[13px] tracking-wide transition-all cursor-pointer whitespace-nowrap group ${
                  isActive
                    ? `${itemTheme.activeText} font-semibold`
                    : `text-slate-600 dark:text-slate-400 ${itemTheme.hoverText} font-normal`
                }`}
              >
                <span>{item.label}</span>

                {/* Active Bottom Indicator Line */}
                {isActive ? (
                  <span className={`absolute bottom-0 left-0 right-0 h-[2.5px] ${itemTheme.activeLine} rounded-full`} />
                ) : (
                  <span className={`absolute bottom-0 left-0 right-0 h-[2px] ${itemTheme.hoverLine} rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-200`} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sisi Kanan: Theme Toggle & Menu Profil Terpadu (Menyatukan Role Admin & Keluar/Logout) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            aria-label="Toggle Theme"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 transition-all cursor-pointer shadow-2xs"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          {/* Profil Button & Dropdown */}
          {user ? (
            <div className="relative" ref={profileRef}>
              {/* Profil Button (Hanya Ikon Lingkaran) */}
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`w-9 h-9 rounded-full border-2 transition-all cursor-pointer shadow-xs overflow-hidden flex items-center justify-center shrink-0 ${
                  isProfileOpen
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'border-emerald-500/40 hover:border-emerald-500'
                }`}
                title={user.name || 'Profil Akun'}
                aria-label="Menu Profil"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold uppercase">
                    {user.name ? user.name.charAt(0) : 'A'}
                  </div>
                )}
              </button>

              {/* Dropdown Menu Popover */}
              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-2 min-w-[145px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                  {/* Tombol Edit Profil */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsEditProfileOpen(true);
                    }}
                    className="w-full flex items-center justify-start gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <UserCog className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Edit Profil</span>
                  </button>

                  {/* Tombol Logout */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-start gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>Masuk</span>
            </Link>
          )}
        </div>
      </div>

      {/* Row 2: Sub Menu untuk Pengolahan Lahan Bibit Tanam (Rencana vs Real, Rerata Bero & Tanam, List Stok Lahan, Data Lahan) */}
      {activeTab === 'pengolahan_lahan_bibit_tanam' && (
        <div className="px-6 py-1.5 flex items-center justify-center gap-5 sm:gap-7 md:gap-9 lg:gap-11 overflow-x-auto no-scrollbar scroll-smooth">
          {PENGOLAHAN_SUB_MENUS.map((item) => {
            const isActive = currentSubTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSetSubTab?.(item.id)}
                className={`relative py-1 px-1 text-xs tracking-wide transition-all cursor-pointer whitespace-nowrap group ${
                  isActive
                    ? `${currentTheme.subActiveText} font-semibold`
                    : `text-slate-500 dark:text-slate-400 ${currentTheme.subHoverText} font-normal`
                }`}
              >
                <span>{item.label}</span>

                {/* Active Underline Indicator Sub Menu */}
                {isActive ? (
                  <span className={`absolute -bottom-1 left-0 right-0 h-[2px] ${currentTheme.subActiveLine} rounded-full`} />
                ) : (
                  <span className={`absolute -bottom-1 left-0 right-0 h-[1.5px] ${currentTheme.hoverLine} rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-150`} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Row 2: Sub Menu untuk Planting (Real Tanam Nanas, Proses Tanam & Selesai Tanam) */}
      {activeTab === 'planting' && (
        <div className="px-6 py-1.5 flex items-center justify-center gap-5 sm:gap-7 md:gap-9 lg:gap-11 overflow-x-auto no-scrollbar scroll-smooth">
          {PLANTING_SUB_MENUS.map((item) => {
            const isActive = (plantingSubTab || 'real_tanam_nanas') === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPlantingSubTab?.(item.id)}
                className={`relative py-1 px-1 text-xs tracking-wide transition-all cursor-pointer whitespace-nowrap group ${
                  isActive
                    ? `${currentTheme.subActiveText} font-semibold`
                    : `text-slate-500 dark:text-slate-400 ${currentTheme.subHoverText} font-normal`
                }`}
              >
                <span>{item.label}</span>

                {/* Active Underline Indicator Sub Menu */}
                {isActive ? (
                  <span className={`absolute -bottom-1 left-0 right-0 h-[2px] ${currentTheme.subActiveLine} rounded-full`} />
                ) : (
                  <span className={`absolute -bottom-1 left-0 right-0 h-[1.5px] ${currentTheme.hoverLine} rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-150`} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Modal Edit Profil */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        user={user}
        onProfileUpdated={(updated) => {
          setUserDirectly(updated);
        }}
      />
    </header>
  );
}
