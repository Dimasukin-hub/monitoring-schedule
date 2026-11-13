'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon, LogOut, ShieldCheck, ChevronDown, Camera, Trash2, LayoutGrid } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/components/AuthProvider';
import { getGorongGorongRoute, getLabitaRoute } from '@/lib/portalRoutes';

export interface MainMenuItem {
  id: string;
  label: string;
}

export const LABITA_MAIN_MENU_ITEMS: MainMenuItem[] = [
  { id: 'executive_summary', label: 'Executive Summary' },
  { id: 'pengolahan_lahan_bibit_tanam', label: 'Pengolahan Lahan' },
  { id: 'planting', label: 'Planting' },
  { id: 'user_management', label: 'Manajemen User' },
];

export const GORONG_GORONG_MAIN_MENU_ITEMS: MainMenuItem[] = [
  { id: 'monitor_gorong_gorong', label: 'Monitor Gorong-Gorong' },
  { id: 'form_input', label: 'Form Input' },
  { id: 'master_data', label: 'Master Data' },
  { id: 'user_management', label: 'Manajemen User' },
];

export const MAIN_MENU_ITEMS: MainMenuItem[] = [
  ...LABITA_MAIN_MENU_ITEMS,
  ...GORONG_GORONG_MAIN_MENU_ITEMS,
];

export interface SubMenuItem {
  id: string;
  label: string;
}

export const EXECUTIVE_SUB_MENUS: SubMenuItem[] = [
  { id: 'pengolahan_lahan', label: 'Pengolahan Lahan' },
  { id: 'tanam', label: 'Tanam' },
];

export const PENGOLAHAN_SUB_MENUS: SubMenuItem[] = [
  { id: 'list_stok_lahan', label: 'List Stok Lahan' },
  { id: 'data_lahan', label: 'Data Lahan' },
];

export const PLANTING_SUB_MENUS: SubMenuItem[] = [
  { id: 'real_tanam_nanas', label: 'Real Tanam Nanas' },
  { id: 'input_real_tanam_petik', label: 'Input Real Tanam & Petik Nanas' },
  { id: 'proses_selesai_tanam', label: 'Proses Tanam & Selesai Tanam' },
  { id: 'update', label: 'Update' },
];

export const ORDER_WILAYAH_SUB_MENUS: SubMenuItem[] = [
  { id: 'order_gorong_gorong', label: 'Order Gorong-Gorong' },
];
export const FORM_INPUT_SUB_MENUS = ORDER_WILAYAH_SUB_MENUS;

export const MASTER_DATA_SUB_MENUS: SubMenuItem[] = [
  { id: 'master_status_lokasi', label: 'Master Status Lokasi' },
  { id: 'master_waterlogging', label: 'Master Waterlogging' },
  { id: 'master_order', label: 'Master Data Order' },
  { id: 'master_drop', label: 'Master Data Drop' },
  { id: 'master_sap', label: 'Upload Data Realisasi SAP' },
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
  update: {
    activeText: 'text-amber-700 dark:text-amber-300',
    activeLine: 'bg-amber-600 dark:bg-amber-400',
    hoverText: 'hover:text-amber-600 dark:hover:text-amber-300',
    hoverLine: 'bg-amber-500/40',
    subActiveText: 'text-amber-700 dark:text-amber-300',
    subActiveLine: 'bg-amber-600 dark:bg-amber-400',
    subHoverText: 'hover:text-amber-600 dark:hover:text-amber-300',
  },
  user_management: {
    activeText: 'text-indigo-700 dark:text-indigo-300',
    activeLine: 'bg-indigo-600 dark:bg-indigo-400',
    hoverText: 'hover:text-indigo-600 dark:hover:text-indigo-300',
    hoverLine: 'bg-indigo-500/40',
    subActiveText: 'text-indigo-700 dark:text-indigo-300',
    subActiveLine: 'bg-indigo-600 dark:bg-indigo-400',
    subHoverText: 'hover:text-indigo-600 dark:hover:text-indigo-300',
  },
  order_wilayah: {
    activeText: 'text-amber-700 dark:text-amber-300',
    activeLine: 'bg-amber-600 dark:bg-amber-400',
    hoverText: 'hover:text-amber-600 dark:hover:text-amber-300',
    hoverLine: 'bg-amber-500/40',
    subActiveText: 'text-amber-700 dark:text-amber-300',
    subActiveLine: 'bg-amber-600 dark:bg-amber-400',
    subHoverText: 'hover:text-amber-600 dark:hover:text-amber-300',
  },
  form_input: {
    activeText: 'text-amber-700 dark:text-amber-300',
    activeLine: 'bg-amber-600 dark:bg-amber-400',
    hoverText: 'hover:text-amber-600 dark:hover:text-amber-300',
    hoverLine: 'bg-amber-500/40',
    subActiveText: 'text-amber-700 dark:text-amber-300',
    subActiveLine: 'bg-amber-600 dark:bg-amber-400',
    subHoverText: 'hover:text-amber-600 dark:hover:text-amber-300',
  },
  master_data: {
    activeText: 'text-violet-700 dark:text-violet-300',
    activeLine: 'bg-violet-600 dark:bg-violet-400',
    hoverText: 'hover:text-violet-600 dark:hover:text-violet-300',
    hoverLine: 'bg-violet-500/40',
    subActiveText: 'text-violet-700 dark:text-violet-300',
    subActiveLine: 'bg-violet-600 dark:bg-violet-400',
    subHoverText: 'hover:text-violet-600 dark:hover:text-violet-300',
  },
  monitor_gorong_gorong: {
    activeText: 'text-blue-700 dark:text-blue-300',
    activeLine: 'bg-blue-600 dark:bg-blue-400',
    hoverText: 'hover:text-blue-600 dark:hover:text-blue-300',
    hoverLine: 'bg-blue-500/40',
    subActiveText: 'text-blue-700 dark:text-blue-300',
    subActiveLine: 'bg-blue-600 dark:bg-blue-400',
    subHoverText: 'hover:text-blue-600 dark:hover:text-blue-300',
  },
};

interface HeaderProps {
  currentPortal?: 'labita' | 'gorong_gorong' | 'landing';
  onSwitchPortal?: (portal: 'labita' | 'gorong_gorong' | 'landing') => void;
  onNavigate?: (tab: string, subTab?: string) => void;
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
  executiveSubTab?: string;
  setExecutiveSubTab?: (subTab: string) => void;
  pengolahanSubTab?: string;
  setPengolahanSubTab?: (subTab: string) => void;
  overviewSubTab?: string;
  setOverviewSubTab?: (subTab: string) => void;
  plantingSubTab?: string;
  setPlantingSubTab?: (subTab: string) => void;
  orderWilayahSubTab?: string;
  setOrderWilayahSubTab?: (subTab: string) => void;
  formInputSubTab?: string;
  setFormInputSubTab?: (subTab: string) => void;
  masterDataSubTab?: string;
  setMasterDataSubTab?: (subTab: string) => void;
  totalLands?: number;
}

export default function Header({
  currentPortal = 'labita',
  onSwitchPortal,
  onNavigate,
  activeTab,
  setActiveTab,
  executiveSubTab,
  setExecutiveSubTab,
  pengolahanSubTab,
  setPengolahanSubTab,
  overviewSubTab,
  setOverviewSubTab,
  plantingSubTab,
  setPlantingSubTab,
  orderWilayahSubTab,
  setOrderWilayahSubTab,
  formInputSubTab,
  setFormInputSubTab,
  masterDataSubTab,
  setMasterDataSubTab,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, isSuperAdmin, isUserFE, isUserWilayah, logout, setUserDirectly } = useAuth();
  const currentPathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSubTab = pengolahanSubTab || overviewSubTab || 'list_stok_lahan';
  const handleSetSubTab = setPengolahanSubTab || setOverviewSubTab;
  const currentTheme = MENU_THEMES[activeTab] || MENU_THEMES.executive_summary;

  // Filter menu berdasarkan portal aktif & hak akses
  const baseItems = currentPortal === 'gorong_gorong'
    ? GORONG_GORONG_MAIN_MENU_ITEMS
    : LABITA_MAIN_MENU_ITEMS;

  const displayedMenuItems = baseItems.filter((item) => {
    if (item.id === 'user_management' || item.id === 'master_data') {
      return Boolean(user && isAdmin);
    }
    if (currentPortal === 'gorong_gorong' && item.id === 'monitor_gorong_gorong') {
      // Sembunyikan menu Monitor Gorong-Gorong untuk User Wilayah dan User FE
      if (user?.role === 'user_wilayah' || user?.role === 'user_fe' || user?.role === 'user' || isUserWilayah || isUserFE || !isAdmin) {
        return false;
      }
    }
    return true;
  });

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
        setShowPhotoMenu(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isProfileOpen]);

  // Handler Upload Foto Profil (Ganti Foto Profil)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUpdatingPhoto(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        // Resize ringan via canvas untuk performa maksimal
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const maxDim = 400;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const resizedBase64 = canvas.toDataURL('image/jpeg', 0.85);

          const res = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: user?.id, avatar: resizedBase64 }),
          });
          const data = await res.json();
          if (data.success && data.user) {
            setUserDirectly(data.user);
          }
          setIsUpdatingPhoto(false);
          setShowPhotoMenu(false);
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      setIsUpdatingPhoto(false);
    }
  };

  // Handler Hapus Foto Profil
  const handleRemovePhoto = async () => {
    try {
      setIsUpdatingPhoto(true);
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user?.id, avatar: null }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUserDirectly(data.user);
      }
      setIsUpdatingPhoto(false);
      setShowPhotoMenu(false);
    } catch (err) {
      console.error('Failed to remove avatar:', err);
      setIsUpdatingPhoto(false);
    }
  };

  return (
    <header className="relative z-40 flex flex-col shrink-0 select-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200 shadow-2xs w-full max-w-full">
      {/* Header Paling Atas (Row 1): Logo GGF, Menu Utama, & Tombol Admin / Profil */}
      <div className="relative px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 w-full max-w-full">
        {/* Sisi Kiri: Logo GGF Kotak Putih & Label Portal */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <Link
            href="/"
            title="Kembali ke Halaman Pilih Portal"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden bg-white border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-center p-1 shadow-xs hover:ring-2 hover:ring-emerald-400/40 transition-all cursor-pointer shrink-0"
          >
            <img
              src="/assets/logo.png"
              alt="Great Giant Foods"
              className="w-full h-full object-contain"
            />
          </Link>
          <div className="hidden sm:flex flex-col">
            <span className="text-[11px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100 leading-none uppercase">
              {currentPortal === 'gorong_gorong' ? 'Gorong-Gorong' : 'Labita'}
            </span>
            <span className="text-[9px] text-[#00873D] dark:text-emerald-400 font-semibold tracking-wider uppercase">
              Plantation Group 1
            </span>
          </div>
        </div>

        {/* Sisi Tengah: Menu Utama (Menu Update hanya muncul setelah Login Admin) */}
        <nav className="flex-1 flex items-center justify-start sm:justify-center gap-3 sm:gap-6 md:gap-8 lg:gap-11 overflow-x-auto no-scrollbar scroll-smooth px-1.5 touch-pan-x min-w-0">
          {displayedMenuItems.map((item) => {
            const isActive = activeTab === item.id || (item.id === 'form_input' && activeTab === 'order_wilayah') || (item.id === 'order_wilayah' && activeTab === 'form_input');
            const itemTheme = MENU_THEMES[item.id] || MENU_THEMES[activeTab] || MENU_THEMES.executive_summary;

            const itemHref =
              currentPortal === 'gorong_gorong'
                ? getGorongGorongRoute(item.id, item.id === 'master_data' ? masterDataSubTab : undefined)
                : getLabitaRoute(
                    item.id,
                    item.id === 'executive_summary'
                      ? (executiveSubTab || 'pengolahan_lahan')
                      : item.id === 'pengolahan_lahan_bibit_tanam'
                      ? (currentSubTab || 'list_stok_lahan')
                      : item.id === 'planting'
                      ? (plantingSubTab || 'real_tanam_nanas')
                      : undefined
                  );

            return (
              <Link
                key={item.id}
                href={itemHref}
                prefetch={false}
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavigate) {
                    onNavigate(item.id);
                  } else {
                    setActiveTab(item.id);
                    if (item.id === 'pengolahan_lahan_bibit_tanam' && handleSetSubTab && !currentSubTab) {
                      handleSetSubTab('list_stok_lahan');
                    }
                    if (item.id === 'executive_summary' && setExecutiveSubTab && !executiveSubTab) {
                      setExecutiveSubTab('pengolahan_lahan');
                    }
                  }
                }}
                className={`relative py-1.5 sm:py-2 px-1 text-[11.5px] sm:text-xs md:text-[13px] tracking-wide transition-all cursor-pointer whitespace-nowrap group ${
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
              </Link>
            );
          })}
        </nav>

        {/* Sisi Kanan: Tombol Portal Utama & Profil User */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Tombol Portal Utama: Mengarah ke Halaman Utama estatepg1.online */}
          <a
            href="https://estatepg1.online"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px] sm:text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer shrink-0"
            title="Kembali ke Halaman Utama estatepg1.online"
            aria-label="Kembali ke Halaman Utama estatepg1.online"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#00873D]" />
            <span className="hidden sm:inline">Portal Utama</span>
            <span className="sm:hidden text-[10px]">Portal</span>
          </a>

          {user ? (
            <div className="relative flex items-center gap-1.5 sm:gap-2" ref={profileRef}>
              {/* Foto Profil Bulat (Sebelah Kiri) Berdiri Sendiri Tanpa Kotak Oval Pembungkus */}
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen((prev) => !prev);
                  setShowPhotoMenu(false);
                }}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 text-white text-xs font-bold uppercase shadow-2xs hover:ring-2 transition-all cursor-pointer ${
                  isSuperAdmin ? 'bg-indigo-600 hover:ring-indigo-400/40' : isAdmin ? 'bg-emerald-600 hover:ring-emerald-400/40' : 'bg-sky-600 hover:ring-sky-400/40'
                }`}
                title={`Profil ${isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'User'}`}
                aria-label="Profil Pengguna"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{user.name ? user.name.charAt(0) : isSuperAdmin ? 'SA' : isAdmin ? 'A' : 'U'}</span>
                )}
              </button>

              {/* Sebelah Kanan Foto Profil: Tulisan Admin / Nama Pengguna & Tanda Panah Dropdown */}
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen((prev) => !prev);
                  setShowPhotoMenu(false);
                }}
                className="flex items-center gap-1.5 py-1 px-1 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer select-none group"
                title="Buka Menu Profil"
                aria-label="Buka Menu Profil"
              >
                <span>{isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : user.name || user.email}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-transform duration-200 ${
                    isProfileOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
                  }`}
                />
              </button>

              {/* Popover Dropdown Profil Terpadu */}
              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
                  {/* WhatsApp Style Profile Avatar & Info */}
                  <div className="flex flex-col items-center text-center pb-3 border-b border-slate-100 dark:border-slate-800 relative">
                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    {/* WhatsApp Profile Circle with Camera Button & Hover */}
                    <div className="relative group mb-2.5">
                      <button
                        type="button"
                        onClick={() => setShowPhotoMenu((prev) => !prev)}
                        className={`w-16 h-16 rounded-full overflow-hidden border-2 shadow-md relative cursor-pointer flex items-center justify-center text-white text-xl font-bold uppercase transition-transform group-hover:scale-105 ${
                          isSuperAdmin ? 'border-indigo-500 bg-indigo-600' : isAdmin ? 'border-emerald-500 bg-emerald-600' : 'border-sky-500 bg-sky-600'
                        }`}
                        title="Klik untuk opsi foto profil"
                      >
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{user.name ? user.name.charAt(0) : isSuperAdmin ? 'SA' : isAdmin ? 'A' : 'U'}</span>
                        )}

                        {/* Overlay Camera on Hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                          <Camera className="w-5 h-5 drop-shadow" />
                          <span className="text-[9px] font-semibold mt-0.5">Ubah</span>
                        </div>
                      </button>

                      {/* Small Camera Badge */}
                      <button
                        type="button"
                        onClick={() => setShowPhotoMenu((prev) => !prev)}
                        className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full text-white border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-xs cursor-pointer transition-transform hover:scale-110 ${
                          isSuperAdmin ? 'bg-indigo-600 hover:bg-indigo-700' : isAdmin ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-sky-600 hover:bg-sky-700'
                        }`}
                        title="Ubah Foto Profil"
                      >
                        <Camera className="w-3 h-3" />
                      </button>

                      {/* WhatsApp-style Popover Menu: Ganti Foto Profil & Hapus Foto Profil */}
                      {showPhotoMenu && (
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-60 animate-in fade-in zoom-in-95 duration-150 text-left">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPhotoMenu(false);
                              fileInputRef.current?.click();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left cursor-pointer"
                          >
                            <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Ganti Foto Profil</span>
                          </button>

                          {user.avatar && (
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              disabled={isUpdatingPhoto}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left cursor-pointer border-t border-slate-100 dark:border-slate-700/60"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                              <span>Hapus Foto Profil</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Di dalam Popover: Badge Role */}
                    {isSuperAdmin ? (
                      <div className="inline-flex items-center gap-1 mt-1 px-3 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold shadow-2xs">
                        Super Admin
                      </div>
                    ) : isAdmin ? (
                      <div className="inline-flex items-center gap-1 mt-1 px-3 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold shadow-2xs">
                        Admin
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 mt-1 px-3 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-[11px] font-bold shadow-2xs">
                        User
                      </div>
                    )}
                  </div>

                  {/* Mode Gelap / Terang di dalam Profil */}
                  <div className="flex items-center justify-between px-2 py-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {theme === 'dark' ? (
                        <Moon className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Sun className="w-4 h-4 text-amber-500" />
                      )}
                      <span>{theme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={toggleTheme}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        theme === 'dark' ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          theme === 'dark' ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Sebelum Login: Tombol Bertuliskan Admin saja (tanpa foto profil, tanpa info user only) */
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(
                currentPathname || (currentPortal === 'gorong_gorong' ? '/gorong-gorong' : '/labita')
              )}`}
              onClick={() => {
                if (typeof window !== 'undefined' && currentPathname) {
                  sessionStorage.setItem('ggf_active_portal', currentPathname);
                }
              }}
              title="Masuk sebagai Admin"
              aria-label="Login Admin"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-bold tracking-wide transition-all shadow-xs hover:shadow-sm active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400 dark:text-white" />
              <span>Admin</span>
            </Link>
          )}
        </div>
      </div>

      {/* Row 2: Sub Menu untuk Executive Summary (Pengolahan Lahan, Tanam) */}
      {activeTab === 'executive_summary' && (
        <div className="px-3 sm:px-6 py-1.5 flex items-center justify-start sm:justify-center gap-3.5 sm:gap-6 md:gap-8 lg:gap-11 overflow-x-auto no-scrollbar scroll-smooth w-full max-w-full touch-pan-x">
          {EXECUTIVE_SUB_MENUS.map((item) => {
            const isActive = (executiveSubTab || 'pengolahan_lahan') === item.id;
            const subHref = getLabitaRoute('executive_summary', item.id);
            return (
              <Link
                key={item.id}
                href={subHref}
                prefetch={false}
                onClick={() => setExecutiveSubTab?.(item.id)}
                className={`relative py-1 px-1 text-[11.5px] sm:text-xs tracking-wide transition-all cursor-pointer whitespace-nowrap group ${
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
              </Link>
            );
          })}
        </div>
      )}

      {/* Row 2: Sub Menu untuk Pengolahan Lahan Bibit Tanam (List Stok Lahan, Data Lahan) */}
      {activeTab === 'pengolahan_lahan_bibit_tanam' && (
        <div className="px-3 sm:px-6 py-1.5 flex items-center justify-start sm:justify-center gap-3.5 sm:gap-6 md:gap-8 lg:gap-11 overflow-x-auto no-scrollbar scroll-smooth w-full max-w-full touch-pan-x">
          {PENGOLAHAN_SUB_MENUS.map((item) => {
            const isActive = currentSubTab === item.id;
            const subHref = getLabitaRoute('pengolahan_lahan_bibit_tanam', item.id);
            return (
              <Link
                key={item.id}
                href={subHref}
                prefetch={false}
                onClick={() => handleSetSubTab?.(item.id)}
                className={`relative py-1 px-1 text-[11.5px] sm:text-xs tracking-wide transition-all cursor-pointer whitespace-nowrap group ${
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
              </Link>
            );
          })}
        </div>
      )}

      {/* Row 2: Sub Menu untuk Planting (Real Tanam Nanas, Input Real Tanam & Petik Nanas, Proses Tanam & Selesai Tanam, Update) */}
      {activeTab === 'planting' && (
        <div className="px-3 sm:px-6 py-1.5 flex items-center justify-start sm:justify-center gap-3.5 sm:gap-6 md:gap-8 lg:gap-11 overflow-x-auto no-scrollbar scroll-smooth w-full max-w-full touch-pan-x">
          {PLANTING_SUB_MENUS.filter((item) => {
            if (item.id === 'update') {
              return Boolean(user && isAdmin);
            }
            return true;
          }).map((item) => {
            const isActive = (plantingSubTab || 'real_tanam_nanas') === item.id;
            const subHref = getLabitaRoute('planting', item.id);
            return (
              <Link
                key={item.id}
                href={subHref}
                prefetch={false}
                onClick={() => setPlantingSubTab?.(item.id)}
                className={`relative py-1 px-1 text-[11.5px] sm:text-xs tracking-wide transition-all cursor-pointer whitespace-nowrap group ${
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
              </Link>
            );
          })}
        </div>
      )}

      {/* Row 2: Sub Menu untuk Order Wilayah / Form Input */}
      {(activeTab === 'order_wilayah' || activeTab === 'form_input') && (
        <div className="px-3 sm:px-6 py-1.5 flex items-center justify-start sm:justify-center gap-3.5 sm:gap-6 md:gap-8 lg:gap-11 overflow-x-auto no-scrollbar scroll-smooth w-full max-w-full touch-pan-x">
          {ORDER_WILAYAH_SUB_MENUS.map((item) => {
            const isActive = (orderWilayahSubTab || 'order_gorong_gorong') === item.id;
            const subHref = getGorongGorongRoute('form_input', item.id);
            return (
              <Link
                key={item.id}
                href={subHref}
                prefetch={false}
                onClick={(e) => {
                  e.preventDefault();
                  setOrderWilayahSubTab?.(item.id);
                }}
                className={`relative py-1 px-1 text-[11.5px] sm:text-xs tracking-wide transition-all cursor-pointer whitespace-nowrap group ${
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
              </Link>
            );
          })}
        </div>
      )}

      {/* Row 2: Sub Menu untuk Master Data (Master Status Lokasi, Master Waterlogging, Upload Data Realisasi SAP) */}
      {activeTab === 'master_data' && (
        <div className="px-3 sm:px-6 py-1.5 flex items-center justify-start sm:justify-center gap-3.5 sm:gap-6 md:gap-8 lg:gap-11 overflow-x-auto no-scrollbar scroll-smooth w-full max-w-full touch-pan-x">
          {MASTER_DATA_SUB_MENUS.map((item) => {
            const isActive = (masterDataSubTab || 'master_status_lokasi') === item.id;
            const subHref = getGorongGorongRoute('master_data', item.id);
            return (
              <Link
                key={item.id}
                href={subHref}
                prefetch={false}
                onClick={(e) => {
                  e.preventDefault();
                  setMasterDataSubTab?.(item.id);
                }}
                className={`relative py-1 px-1 text-[11.5px] sm:text-xs tracking-wide transition-all cursor-pointer whitespace-nowrap group ${
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
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}

