'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sun,
  Moon,
  LogOut,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Camera,
  Trash2,
  LayoutGrid,
  Menu,
  X,
  Search,
  BarChart3,
  Tractor,
  Sprout,
  Users,
  Layers,
  Activity,
  ClipboardList,
  Database,
  FileText,
  Truck,
  CheckSquare,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/components/AuthProvider';
import { getGorongGorongRoute, getLabitaRoute, getSulamRoute } from '@/lib/portalRoutes';
import { hasMenuAccess, normalizeMenuId, normalizePortalKey } from '@/lib/menuAccess';

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
  { id: 'control_board', label: 'Control Board' },
  { id: 'form_input', label: 'Form Input' },
  { id: 'master_data', label: 'Master Data' },
  { id: 'user_management', label: 'Manajemen User' },
];

export const SULAM_MAIN_MENU_ITEMS: MainMenuItem[] = [
  { id: 'monitor_sulam', label: 'Monitoring Sulam' },
  { id: 'form_order_sulam', label: 'Form Order Sulam' },
  { id: 'form_drop_sulam', label: 'Form Drop Sulam' },
  { id: 'form_realisasi_sulam', label: 'Form Realisasi Sulam' },
  { id: 'master_data', label: 'Master Data' },
  { id: 'user_management', label: 'Manajemen User' },
];

export const MAIN_MENU_ITEMS: MainMenuItem[] = [
  ...LABITA_MAIN_MENU_ITEMS,
  ...GORONG_GORONG_MAIN_MENU_ITEMS,
  ...SULAM_MAIN_MENU_ITEMS,
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
  { id: 'master_pasang_manual', label: 'Master Data Pasang Manual' },
  { id: 'master_pindah', label: 'Master Data Pindah Lokasi' },
  { id: 'master_sap', label: 'Upload Data Realisasi SAP' },
];

export const SULAM_MASTER_DATA_SUB_MENUS: SubMenuItem[] = [
  { id: 'master_status_lokasi', label: 'Master Status Lokasi' },
  { id: 'master_order', label: 'Master Data Order Sulam' },
  { id: 'master_drop', label: 'Master Data Drop Bibit' },
  { id: 'master_real', label: 'Master Data Real Sulam' },
  { id: 'master_spek', label: 'Master Data Spek Bibit Sulam' },
];

export const OVERVIEW_SUB_MENUS = PENGOLAHAN_SUB_MENUS;

interface MenuVisualMeta {
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MENU_META: Record<string, MenuVisualMeta> = {
  executive_summary: {
    subtitle: 'Ringkasan Eksekutif',
    description: 'KPI stok pengolahan lahan, bero & progres tanam PG1',
    icon: BarChart3,
  },
  pengolahan_lahan_bibit_tanam: {
    subtitle: 'Olah Tanah PG 1',
    description: 'List stok lahan siap olah & tabel induk data lahan',
    icon: Tractor,
  },
  planting: {
    subtitle: 'Realisasi Tanam',
    description: 'Monitoring tanam nanas, input petik & quick update',
    icon: Sprout,
  },
  monitor_gorong_gorong: {
    subtitle: 'Saldo & Kebutuhan',
    description: 'Pengawasan order, dropping & saldo fisik per diameter',
    icon: Layers,
  },
  control_board: {
    subtitle: 'Verifikasi Harian',
    description: 'Grafik progres kedatangan, pemasangan & audit SAP',
    icon: Activity,
  },
  form_input: {
    subtitle: 'Order & Lapangan',
    description: 'Pengajuan order, drop, pasang manual & pindah lokasi',
    icon: ClipboardList,
  },
  monitor_sulam: {
    subtitle: 'Pantau Sulam PG 1',
    description: 'Monitoring lokasi prioritas sulam, ritase & realisasi',
    icon: Sprout,
  },
  form_order_sulam: {
    subtitle: 'Order & Approval',
    description: 'Pengajuan kebutuhan bibit sulam, cetak & approval tiket',
    icon: FileText,
  },
  form_drop_sulam: {
    subtitle: 'Kedatangan Bibit',
    description: 'Pencatatan drop bibit sulam CD & Fuso ke lahan',
    icon: Truck,
  },
  form_realisasi_sulam: {
    subtitle: 'Realisasi Tanam',
    description: 'Input realisasi tanam sulam & jumlah tenaga kerja',
    icon: CheckSquare,
  },
  master_data: {
    subtitle: 'Tabel Referensi',
    description: 'Kelola master status lokasi, transaksi & upload data',
    icon: Database,
  },
  user_management: {
    subtitle: 'Hak Akses Akun',
    description: 'Kelola pengguna, role, wilayah & izin akses menu',
    icon: Users,
  },
};

const PORTAL_BRAND: Record<string, { title: string; badge: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }> = {
  labita: {
    title: 'Dashboard Labita',
    badge: 'Lahan & Tanam',
    subtitle: 'Field Establishment',
    icon: Tractor,
  },
  gorong_gorong: {
    title: 'Dashboard Gorong-Gorong',
    badge: 'Drainase PG 1',
    subtitle: 'Field Establishment',
    icon: Layers,
  },
  sulam: {
    title: 'Dashboard Sulam',
    badge: 'Sulam PG 1',
    subtitle: 'Field Establishment',
    icon: Sprout,
  },
};

interface HeaderProps {
  currentPortal?: 'labita' | 'gorong_gorong' | 'sulam' | 'landing';
  onSwitchPortal?: (portal: 'labita' | 'gorong_gorong' | 'sulam' | 'landing') => void;
  onNavigate?: (tab: string, subTab?: string) => void;
  activeTab: string;
  onTabChange?: (tab: string) => void;
  setActiveTab?: (tab: string) => void;
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
  onMasterDataSubTabChange?: (subTab: string) => void;
  totalLands?: number;
}

export default function Header({
  currentPortal = 'labita',
  onNavigate,
  activeTab,
  onTabChange,
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
  masterDataSubTab,
  setMasterDataSubTab,
  onMasterDataSubTabChange,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const {
    user,
    isAdmin,
    isSuperAdmin,
    roleDisplayName,
    logout,
    setUserDirectly,
  } = useAuth();
  const currentPathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSubTab = pengolahanSubTab || overviewSubTab || 'list_stok_lahan';
  const handleSetSubTab = setPengolahanSubTab || setOverviewSubTab;
  const portalKey = normalizePortalKey(currentPortal);
  const normalizedActiveTab = normalizeMenuId(portalKey, activeTab);
  const brandInfo = PORTAL_BRAND[portalKey] || PORTAL_BRAND.gorong_gorong;
  const BrandIcon = brandInfo.icon;

  // Filter menu sesuai portal aktif & hak akses user (default role / centang kustom Super Admin)
  const baseItems =
    currentPortal === 'sulam'
      ? SULAM_MAIN_MENU_ITEMS
      : currentPortal === 'gorong_gorong'
      ? GORONG_GORONG_MAIN_MENU_ITEMS
      : LABITA_MAIN_MENU_ITEMS;

  const displayedMenuItems = baseItems.filter((item) => {
    if (!user) return false;
    return hasMenuAccess(user, portalKey, item.id);
  });

  const filteredDrawerItems = displayedMenuItems.filter((item) => {
    if (!menuSearchQuery.trim()) return true;
    const q = menuSearchQuery.toLowerCase();
    const meta = MENU_META[item.id];
    return (
      item.label.toLowerCase().includes(q) ||
      (meta?.subtitle || '').toLowerCase().includes(q) ||
      (meta?.description || '').toLowerCase().includes(q)
    );
  });

  // Sub-menu untuk tab yang sedang aktif (ditampilkan di Top Navbar & Mobile Dropdown)
  const activeSubMenuConfig: {
    items: SubMenuItem[];
    activeId: string;
    getHref: (id: string) => string;
    onSelect: (id: string) => void;
    label: string;
  } | null = (() => {
    if (normalizedActiveTab === 'executive_summary') {
      return {
        label: 'Sub Menu Executive Summary',
        items: EXECUTIVE_SUB_MENUS,
        activeId: executiveSubTab || 'pengolahan_lahan',
        getHref: (id) => getLabitaRoute('executive_summary', id),
        onSelect: (id) => setExecutiveSubTab?.(id),
      };
    }
    if (normalizedActiveTab === 'pengolahan_lahan_bibit_tanam') {
      return {
        label: 'Sub Menu Pengolahan Lahan',
        items: PENGOLAHAN_SUB_MENUS,
        activeId: currentSubTab,
        getHref: (id) => getLabitaRoute('pengolahan_lahan_bibit_tanam', id),
        onSelect: (id) => handleSetSubTab?.(id),
      };
    }
    if (normalizedActiveTab === 'planting') {
      return {
        label: 'Sub Menu Planting',
        items: PLANTING_SUB_MENUS.filter((item) => item.id !== 'update' || Boolean(user && isAdmin)),
        activeId: plantingSubTab || 'real_tanam_nanas',
        getHref: (id) => getLabitaRoute('planting', id),
        onSelect: (id) => setPlantingSubTab?.(id),
      };
    }
    if (normalizedActiveTab === 'form_input' && currentPortal === 'gorong_gorong') {
      return {
        label: 'Sub Menu Form Input',
        items: ORDER_WILAYAH_SUB_MENUS,
        activeId: orderWilayahSubTab || 'order_gorong_gorong',
        getHref: (id) => getGorongGorongRoute('form_input', id),
        onSelect: (id) => setOrderWilayahSubTab?.(id),
      };
    }
    if (normalizedActiveTab === 'master_data') {
      return {
        label: 'Sub Menu Master Data',
        items: currentPortal === 'sulam' ? SULAM_MASTER_DATA_SUB_MENUS : MASTER_DATA_SUB_MENUS,
        activeId: masterDataSubTab || 'master_status_lokasi',
        getHref: (id) =>
          currentPortal === 'sulam'
            ? getSulamRoute('master_data', id)
            : getGorongGorongRoute('master_data', id),
        onSelect: (id) => {
          if (onMasterDataSubTabChange) {
            onMasterDataSubTabChange(id);
          } else {
            setMasterDataSubTab?.(id);
          }
        },
      };
    }
    return null;
  })();

  const getMainItemHref = (itemId: string) => {
    if (currentPortal === 'sulam') {
      return getSulamRoute(itemId, itemId === 'master_data' ? masterDataSubTab : undefined);
    }
    if (currentPortal === 'gorong_gorong') {
      return getGorongGorongRoute(itemId, itemId === 'master_data' ? masterDataSubTab : undefined);
    }
    return getLabitaRoute(
      itemId,
      itemId === 'executive_summary'
        ? executiveSubTab || 'pengolahan_lahan'
        : itemId === 'pengolahan_lahan_bibit_tanam'
        ? currentSubTab || 'list_stok_lahan'
        : itemId === 'planting'
        ? plantingSubTab || 'real_tanam_nanas'
        : undefined
    );
  };

  const handleSelectMainItem = (itemId: string) => {
    if (onNavigate) {
      onNavigate(itemId);
    } else {
      if (onTabChange) {
        onTabChange(itemId);
      } else if (setActiveTab) {
        setActiveTab(itemId);
      }
      if (itemId === 'pengolahan_lahan_bibit_tanam' && handleSetSubTab && !currentSubTab) {
        handleSetSubTab('list_stok_lahan');
      }
      if (itemId === 'executive_summary' && setExecutiveSubTab && !executiveSubTab) {
        setExecutiveSubTab('pengolahan_lahan');
      }
    }
    setSidebarOpen(false);
    setMobileMenuOpen(false);
  };

  // Handle ESC key & body scroll lock untuk expanded sidebar drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setMobileMenuOpen(false);
      }
    };
    if (sidebarOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // Tutup profile popover saat klik di luar
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

  // Handler Upload Foto Profil
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUpdatingPhoto(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
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
    <>
      {/* ========================================================= */}
      {/* 1. LEFT MINI SIDEBAR (Desktop only, w-16 / 64px)          */}
      {/* ========================================================= */}
      <aside
        className="fixed top-0 bottom-0 left-0 w-16 bg-white dark:bg-slate-900 border-r border-[#DDE5DF] dark:border-slate-800 z-[60] hidden md:flex flex-col items-center py-4 shadow-xs select-none overflow-visible transition-colors duration-200"
        aria-label={`Mini Sidebar ${brandInfo.title}`}
      >
        <div className="w-full flex flex-col items-center">
          {/* Tombol Hamburger Drawer */}
          <div className="relative group w-full flex justify-center">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="w-10 h-10 rounded-xl bg-[#F8FAF9] dark:bg-slate-800 hover:bg-[#EEF4F0] dark:hover:bg-slate-700 border border-[#DDE5DF] dark:border-slate-700 text-[#16823B] dark:text-emerald-400 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              aria-label={sidebarOpen ? 'Tutup Menu Navigasi' : 'Buka Menu Navigasi'}
              title="Daftar Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-[#17231B] text-white rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-[90] whitespace-nowrap border border-gray-700/60 flex items-center gap-2">
              <span className="font-bold text-xs text-white">{brandInfo.title}</span>
              <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded font-medium">
                {displayedMenuItems.length} Menu
              </span>
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-[#17231B]" />
            </div>
          </div>

          <div className="w-8 h-px bg-[#EAEFEB] dark:bg-slate-800 my-3" />

          {/* Daftar Ikon Menu Utama */}
          <div className="w-full flex flex-col items-center gap-2 py-1 px-2 overflow-visible">
            {displayedMenuItems.map((item) => {
              const isActive = normalizedActiveTab === item.id;
              const meta = MENU_META[item.id];
              const IconComponent = meta?.icon || Layers;

              return (
                <div key={item.id} className="relative group w-full flex justify-center">
                  <Link
                    href={getMainItemHref(item.id)}
                    prefetch={false}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSelectMainItem(item.id);
                    }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center relative transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-[#16823B] text-white shadow-xs font-bold ring-2 ring-[#16823B]/30'
                        : 'text-[#5F6B63] dark:text-slate-400 hover:text-[#16823B] dark:hover:text-emerald-400 hover:bg-[#EAF3EC] dark:hover:bg-slate-800'
                    }`}
                    aria-label={item.label}
                  >
                    <IconComponent className="w-5 h-5 shrink-0" />
                    {isActive && (
                      <span className="absolute -left-2 w-1 h-5 bg-[#16823B] dark:bg-emerald-400 rounded-r-full" />
                    )}
                  </Link>

                  {/* Floating Rich Tooltip saat hover */}
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-[#17231B] text-white rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-[90] min-w-[210px] max-w-[260px] flex flex-col gap-1 border border-gray-700/60 drop-shadow-xl">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-white leading-tight">
                          {item.label}
                        </span>
                        {meta?.subtitle && (
                          <span className="text-[10px] text-emerald-300 leading-tight">
                            {meta.subtitle}
                          </span>
                        )}
                      </div>
                      {isActive ? (
                        <span className="text-[9px] bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 px-1.5 py-0.5 rounded font-semibold shrink-0">
                          Aktif
                        </span>
                      ) : (
                        <span className="text-[9px] text-gray-400 font-medium shrink-0">
                          Tersedia
                        </span>
                      )}
                    </div>
                    {meta?.description && (
                      <p className="text-[11px] text-gray-300 leading-snug mt-0.5">
                        {meta.description}
                      </p>
                    )}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-[#17231B]" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. TOP NAVBAR                                             */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-[55] bg-white dark:bg-slate-900 border-b border-[#DDE5DF] dark:border-slate-800 shadow-2xs w-full transition-colors duration-200 select-none">
        <div className="w-full md:w-[calc(100%-4rem)] md:ml-16 px-4 sm:px-6 lg:px-8">
          <div className="h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
            {/* Brand Logo & Title */}
            <Link
              href="/"
              title="Kembali ke Halaman Pilih Portal"
              className="flex items-center gap-2 sm:gap-3.5 shrink-0 py-1 group focus:outline-none min-w-0 cursor-pointer"
            >
              <div className="h-10 sm:h-12 w-auto flex items-center shrink-0 overflow-hidden">
                <img
                  src="/assets/logo.png"
                  alt="GGF Logo"
                  className="h-10 sm:h-12 w-auto object-contain"
                />
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-lg text-[#17231B] dark:text-white group-hover:text-[#16823B] dark:group-hover:text-emerald-400 tracking-tight leading-tight transition-colors truncate">
                    {brandInfo.title}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EAF3EC] dark:bg-emerald-950/60 text-[#16823B] dark:text-emerald-300 border border-[#CBE0D1] dark:border-emerald-800 hidden sm:inline-block shrink-0">
                    {brandInfo.badge}
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs text-[#5F6B63] dark:text-slate-400 hidden sm:block font-medium leading-tight mt-0.5 truncate">
                  {brandInfo.subtitle}
                </span>
              </div>
            </Link>

            {/* Center Sub-Menu Navigation (Segmented Pill ala DashboardCostControl) */}
            {activeSubMenuConfig && activeSubMenuConfig.items.length > 0 && (
              <div className="hidden md:flex items-center gap-1 bg-[#F8FAF9] dark:bg-slate-800/80 border border-[#DDE5DF] dark:border-slate-700 p-1 rounded-xl shadow-2xs max-w-[44vw] xl:max-w-[56vw] overflow-x-auto no-scrollbar min-w-0">
                {activeSubMenuConfig.items.map((sub) => {
                  const isSubActive = activeSubMenuConfig.activeId === sub.id;
                  return (
                    <Link
                      key={sub.id}
                      href={activeSubMenuConfig.getHref(sub.id)}
                      prefetch={false}
                      onClick={(e) => {
                        e.preventDefault();
                        activeSubMenuConfig.onSelect(sub.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap select-none shrink-0 ${
                        isSubActive
                          ? 'bg-white dark:bg-slate-900 text-[#16823B] dark:text-emerald-400 font-bold shadow-xs border border-[#CBE0D1] dark:border-emerald-700'
                          : 'text-[#5F6B63] dark:text-slate-400 hover:text-[#17231B] dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50 font-semibold border border-transparent'
                      }`}
                    >
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Right Actions: Portal Utama + Profil / Login + Mobile Hamburger */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <Link
                href="/"
                className="hidden sm:inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-[#DDE5DF] dark:border-slate-700 bg-[#F8FAF9] dark:bg-slate-800 hover:bg-[#EEF4F0] dark:hover:bg-slate-700 text-[#2C3830] dark:text-slate-200 font-semibold text-xs transition-all shadow-2xs"
                title="Kembali ke Portal Utama"
              >
                <LayoutGrid className="w-4 h-4 text-[#5F6B63] dark:text-emerald-400" />
                <span>Portal Utama</span>
              </Link>

              {user ? (
                <div className="relative flex items-center gap-1.5 sm:gap-2" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen((prev) => !prev);
                      setShowPhotoMenu(false);
                    }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-bold uppercase shadow-2xs transition-all hover:ring-2 cursor-pointer shrink-0 ${
                      isSuperAdmin
                        ? 'bg-indigo-600 hover:ring-indigo-400/40'
                        : isAdmin
                        ? 'bg-[#16823B] hover:ring-emerald-400/40'
                        : 'bg-sky-600 hover:ring-sky-400/40'
                    }`}
                    title={`Profil ${roleDisplayName || (isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin FE' : 'User')}`}
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name || 'User'} className="w-full h-full object-cover" />
                    ) : (
                      <span>{user.name ? user.name.charAt(0) : isSuperAdmin ? 'SA' : isAdmin ? 'A' : 'U'}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen((prev) => !prev);
                      setShowPhotoMenu(false);
                    }}
                    className="hidden sm:flex items-center gap-1.5 py-1 px-1 text-xs font-bold text-[#17231B] dark:text-slate-200 hover:text-[#16823B] dark:hover:text-emerald-400 transition-colors cursor-pointer select-none group"
                    title="Buka Menu Profil"
                    aria-label="Buka Menu Profil"
                  >
                    <span className="max-w-[140px] truncate">{roleDisplayName || user.name || user.email}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#89938D] group-hover:text-[#16823B] transition-transform duration-200 ${
                        isProfileOpen ? 'rotate-180 text-[#16823B]' : ''
                      }`}
                    />
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-[#DDE5DF] dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-[80] animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
                      <div className="flex flex-col items-center text-center pb-3 border-b border-slate-100 dark:border-slate-800 relative">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />

                        <div className="relative group mb-2.5">
                          <button
                            type="button"
                            onClick={() => setShowPhotoMenu((prev) => !prev)}
                            className={`w-16 h-16 rounded-full overflow-hidden border-2 shadow-md relative cursor-pointer flex items-center justify-center text-white text-xl font-bold uppercase transition-transform group-hover:scale-105 ${
                              isSuperAdmin
                                ? 'border-indigo-500 bg-indigo-600'
                                : isAdmin
                                ? 'border-emerald-500 bg-[#16823B]'
                                : 'border-sky-500 bg-sky-600'
                            }`}
                            title="Klik untuk opsi foto profil"
                          >
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name || 'User'} className="w-full h-full object-cover" />
                            ) : (
                              <span>{user.name ? user.name.charAt(0) : isSuperAdmin ? 'SA' : isAdmin ? 'A' : 'U'}</span>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                              <Camera className="w-5 h-5 drop-shadow" />
                              <span className="text-[9px] font-semibold mt-0.5">Ubah</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowPhotoMenu((prev) => !prev)}
                            className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full text-white border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-xs cursor-pointer transition-transform hover:scale-110 ${
                              isSuperAdmin
                                ? 'bg-indigo-600 hover:bg-indigo-700'
                                : isAdmin
                                ? 'bg-[#16823B] hover:bg-[#126B30]'
                                : 'bg-sky-600 hover:bg-sky-700'
                            }`}
                            title="Ubah Foto Profil"
                          >
                            <Camera className="w-3 h-3" />
                          </button>

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
                                <Camera className="w-4 h-4 text-[#16823B] dark:text-emerald-400" />
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

                        <div
                          className={`inline-flex items-center gap-1 mt-1 px-3 py-0.5 rounded-full text-[11px] font-bold shadow-2xs ${
                            isSuperAdmin
                              ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                              : isAdmin
                              ? 'bg-[#EAF3EC] dark:bg-emerald-950/60 text-[#16823B] dark:text-emerald-300'
                              : 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                          }`}
                        >
                          {roleDisplayName || 'User'}
                        </div>
                      </div>

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
                            theme === 'dark' ? 'bg-[#16823B]' : 'bg-slate-300 dark:bg-slate-700'
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
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(
                    currentPathname || (currentPortal === 'gorong_gorong' ? '/gorong-gorong' : '/labita')
                  )}`}
                  onClick={() => {
                    if (typeof window !== 'undefined' && currentPathname) {
                      sessionStorage.setItem('ggf_active_portal', currentPathname);
                    }
                  }}
                  title="Masuk ke Sistem"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#16823B] hover:bg-[#126B30] text-white text-xs font-bold tracking-wide transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-200" />
                  <span>Login</span>
                </Link>
              )}

              {/* Tombol Hamburger Mobile (< md) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-[#DDE5DF] dark:border-slate-700 bg-[#F8FAF9] dark:bg-slate-800 hover:bg-[#EEF4F0] dark:hover:bg-slate-700 text-[#17231B] dark:text-white transition-all shadow-2xs cursor-pointer active:scale-95"
                aria-label={mobileMenuOpen ? 'Tutup Menu Navigasi' : 'Buka Menu Navigasi'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-[#16823B] dark:text-emerald-400" />
                ) : (
                  <Menu className="w-5 h-5 text-[#16823B] dark:text-emerald-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu (md:hidden) */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#DDE5DF] dark:border-slate-800 bg-white dark:bg-slate-900 px-3 sm:px-4 py-3.5 space-y-3 shadow-lg max-h-[80vh] overflow-y-auto animate-in slide-in-from-top-2 duration-150">
            {activeSubMenuConfig && activeSubMenuConfig.items.length > 0 && (
              <div className="space-y-1.5 pb-2.5 border-b border-[#EAEFEB] dark:border-slate-800">
                <span className="text-[10px] font-bold text-[#89938D] uppercase tracking-wider px-1">
                  {activeSubMenuConfig.label}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {activeSubMenuConfig.items.map((sub) => {
                    const isSubActive = activeSubMenuConfig.activeId === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          activeSubMenuConfig.onSelect(sub.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border text-left truncate transition-all cursor-pointer ${
                          isSubActive
                            ? 'bg-[#16823B] text-white border-[#16823B] shadow-xs'
                            : 'bg-[#F8FAF9] dark:bg-slate-800 text-[#17231B] dark:text-slate-200 border-[#DDE5DF] dark:border-slate-700'
                        }`}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="w-full space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#5F6B63] dark:text-slate-400 uppercase tracking-wider px-1">
                <span>Menu {brandInfo.title}</span>
                <span className="text-[10px] text-[#16823B] dark:text-emerald-300 font-semibold bg-[#EAF3EC] dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-[#CBE0D1] dark:border-emerald-800">
                  {displayedMenuItems.length} Menu
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {displayedMenuItems.map((item) => {
                  const isActive = normalizedActiveTab === item.id;
                  const meta = MENU_META[item.id];
                  const Icon = meta?.icon || Layers;

                  return (
                    <Link
                      key={item.id}
                      href={getMainItemHref(item.id)}
                      prefetch={false}
                      onClick={(e) => {
                        e.preventDefault();
                        handleSelectMainItem(item.id);
                      }}
                      className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-all border ${
                        isActive
                          ? 'bg-[#EAF3EC] dark:bg-emerald-950/60 text-[#16823B] dark:text-emerald-300 font-bold border-[#CBE0D1] dark:border-emerald-800'
                          : 'text-[#2C3830] dark:text-slate-200 hover:bg-[#F8FAF9] dark:hover:bg-slate-800 border-[#EAEFEB] dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#16823B] dark:text-emerald-400' : 'text-[#5F6B63] dark:text-slate-400'}`} />
                        <div className="flex flex-col truncate">
                          <span className="truncate">{item.label}</span>
                          {meta?.subtitle && (
                            <span className="text-[10px] text-[#5F6B63] dark:text-slate-400 font-normal truncate">
                              {meta.subtitle}
                            </span>
                          )}
                        </div>
                      </div>
                      {isActive && (
                        <span className="text-[9px] bg-[#16823B] text-white px-2 py-0.5 rounded-full font-bold shrink-0">
                          Aktif
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-[#EAEFEB] dark:border-slate-800">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl border border-[#DDE5DF] dark:border-slate-700 bg-[#F8FAF9] dark:bg-slate-800 text-[#2C3830] dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-[#5F6B63] dark:text-emerald-400" />
                  <span>Kembali ke Portal Utama</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* 3. BACKDROP OVERLAY (Desktop Drawer)                      */}
      {/* ========================================================= */}
      <div
        className={`hidden md:block fixed inset-0 bg-[#0c1a10]/50 backdrop-blur-xs z-[65] transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* ========================================================= */}
      {/* 4. EXPANDED LEFT SIDEBAR DRAWER (Desktop)                 */}
      {/* ========================================================= */}
      <aside
        className={`hidden md:flex fixed top-0 bottom-0 left-0 w-[340px] sm:w-[370px] max-w-[92vw] bg-white dark:bg-slate-900 z-[75] shadow-2xl flex-col border-r border-[#DDE5DF] dark:border-slate-800 transition-transform duration-300 ease-in-out transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={`Navigasi ${brandInfo.title}`}
      >
        <div className="p-4 sm:p-5 border-b border-[#DDE5DF] dark:border-slate-800 flex items-center justify-between gap-2 bg-[#F8FAF9]/80 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-[#EAF3EC] dark:bg-emerald-950/60 border border-[#CBE0D1] dark:border-emerald-800 flex items-center justify-center text-[#16823B] dark:text-emerald-400 shrink-0">
              <BrandIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-nowrap">
                <h2 className="font-extrabold text-[15px] text-[#17231B] dark:text-white leading-tight whitespace-nowrap truncate">
                  {brandInfo.title}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF3EC] dark:bg-emerald-950/60 text-[#16823B] dark:text-emerald-300 border border-[#CBE0D1] dark:border-emerald-800 whitespace-nowrap shrink-0">
                  {displayedMenuItems.length} Menu
                </span>
              </div>
              <p className="text-xs text-[#5F6B63] dark:text-slate-400 font-medium mt-0.5 whitespace-nowrap truncate">
                {brandInfo.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-[#5F6B63] dark:text-slate-400 hover:text-[#17231B] dark:hover:text-white hover:bg-[#EAEFEB] dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer shrink-0"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-[#EAEFEB] dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-[#89938D] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={menuSearchQuery}
              onChange={(e) => setMenuSearchQuery(e.target.value)}
              placeholder="Cari Menu Dashboard"
              className="w-full pl-9.5 pr-8 py-2 text-xs sm:text-sm bg-[#F8FAF9] dark:bg-slate-800 border border-[#DDE5DF] dark:border-slate-700 rounded-xl text-[#17231B] dark:text-white placeholder-[#89938D] focus:outline-none focus:ring-2 focus:ring-[#16823B]/30 focus:border-[#16823B] transition-all"
            />
            {menuSearchQuery && (
              <button
                type="button"
                onClick={() => setMenuSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#89938D] hover:text-[#17231B] dark:hover:text-white p-0.5 cursor-pointer"
                aria-label="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Daftar Kartu Menu Portal */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-[11px] font-bold text-[#89938D] uppercase tracking-wider">
              Daftar Menu
            </span>
            <span className="text-[11px] text-[#5F6B63] dark:text-slate-400">
              {filteredDrawerItems.length} dari {displayedMenuItems.length}
            </span>
          </div>

          {filteredDrawerItems.length === 0 ? (
            <div className="py-8 text-center text-[#89938D] text-xs">
              Tidak ada menu yang cocok dengan &quot;{menuSearchQuery}&quot;
            </div>
          ) : (
            filteredDrawerItems.map((item) => {
              const isActive = normalizedActiveTab === item.id;
              const meta = MENU_META[item.id];
              const IconComponent = meta?.icon || Layers;

              return (
                <Link
                  key={item.id}
                  href={getMainItemHref(item.id)}
                  prefetch={false}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelectMainItem(item.id);
                  }}
                  className={`group p-3 rounded-xl border transition-all flex items-start gap-3 relative ${
                    isActive
                      ? 'bg-[#EAF3EC] dark:bg-emerald-950/50 border-[#CBE0D1] dark:border-emerald-800 text-[#16823B] dark:text-emerald-300 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-[#EAEFEB] dark:border-slate-800 hover:border-[#16823B]/40 hover:bg-[#F8FAF9] dark:hover:bg-slate-800 text-[#2C3830] dark:text-slate-200'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isActive
                        ? 'bg-[#16823B] text-white shadow-xs'
                        : 'bg-[#F8FAF9] dark:bg-slate-800 text-[#5F6B63] dark:text-slate-400 group-hover:bg-[#EAF3EC] dark:group-hover:bg-emerald-950/60 group-hover:text-[#16823B] dark:group-hover:text-emerald-300'
                    }`}
                  >
                    <IconComponent className="w-4.5 h-4.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <div>
                        <span className="text-xs sm:text-sm font-bold block">
                          {item.label}
                        </span>
                        {meta?.subtitle && (
                          <span className="text-[10px] text-[#5F6B63] dark:text-slate-400 block -mt-0.5">
                            {meta.subtitle}
                          </span>
                        )}
                      </div>
                      {isActive ? (
                        <span className="text-[10px] bg-[#16823B] text-white px-2 py-0.5 rounded-full font-bold shrink-0">
                          Aktif
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#89938D] group-hover:text-[#16823B] group-hover:translate-x-0.5 transition-all shrink-0" />
                      )}
                    </div>
                    {meta?.description && (
                      <p
                        className={`text-[11px] line-clamp-1 mt-1 ${
                          isActive ? 'text-[#16823B]/80 dark:text-emerald-300/80 font-medium' : 'text-[#5F6B63] dark:text-slate-400'
                        }`}
                      >
                        {meta.description}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>

        <div className="px-4 py-3 border-t border-[#DDE5DF] dark:border-slate-800 bg-[#F8FAF9] dark:bg-slate-800/50 text-center text-[11px] text-[#89938D] font-medium shrink-0">
          © 2026 Great Giant Foods • Plantation Group 1
        </div>
      </aside>
    </>
  );
}
