'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingUp,
  Package,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  ListFilter,
  Eye,
  XCircle,
  MapPin,
  Calendar,
  Plus,
  UploadCloud,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import MasterLokasiDetailDrawer from '@/components/MasterLokasiDetailDrawer';

export default function MonitorGorongGorongView() {
  const [activeTableTab, setActiveTableTab] = useState<'order' | 'belum_order'>('order');
  const [selectedWilayah, setSelectedWilayah] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedPrioritas, setSelectedPrioritas] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSearchLocations, setSelectedSearchLocations] = useState<string[]>([]);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [masterLocationsList, setMasterLocationsList] = useState<string[]>([]);
  const [selectedDiameterFilter, setSelectedDiameterFilter] = useState<number | 'ALL'>(40);
  const [chartViewMode, setChartViewMode] = useState<'monthly' | 'wilayah'>('monthly');

  // Custom Dropdown Open States
  const [isWilayahDropdownOpen, setIsWilayahDropdownOpen] = useState<boolean>(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState<boolean>(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState<boolean>(false);
  const [isPrioritasDropdownOpen, setIsPrioritasDropdownOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Upload States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<'merge' | 'full_replace'>('merge');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);

  const [summaryData, setSummaryData] = useState<any>(null);
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Click outside listener untuk menutup dropdown filter & search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.wilayah-filter-container')) {
        setIsWilayahDropdownOpen(false);
      }
      if (!target.closest('.status-filter-container')) {
        setIsStatusDropdownOpen(false);
      }
      if (!target.closest('.year-filter-container')) {
        setIsYearDropdownOpen(false);
      }
      if (!target.closest('.prioritas-filter-container')) {
        setIsPrioritasDropdownOpen(false);
      }
      if (!target.closest('.multisearch-container')) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Auto-refresh saat ada transaksi baru disimpan di Form Order
  useEffect(() => {
    const handleUpdate = () => loadData(true);
    window.addEventListener('gorong_gorong_updated', handleUpdate);
    return () => window.removeEventListener('gorong_gorong_updated', handleUpdate);
  }, []);

  // Ambil kumpulan master lokasi lengkap agar daftar saran autocomplete tidak terpotong saat filter tabel aktif
  useEffect(() => {
    fetch('/api/gorong-gorong/master-lokasi?all=true')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          const locs: string[] = res.data.map((item: any) => String(item.lokasi || '').trim()).filter(Boolean);
          setMasterLocationsList(Array.from(new Set<string>(locs)).sort());
        }
      })
      .catch((err) => console.error('Error fetching master locations list:', err));
  }, []);

  // Load Data dari API
  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (selectedWilayah.length > 0) params.set('wilayah', selectedWilayah.join(','));
      if (selectedStatus.length > 0) params.set('status', selectedStatus.join(','));
      if (selectedYears.length > 0) params.set('tahun', selectedYears.join(','));
      if (selectedPrioritas.length > 0) params.set('prioritas', selectedPrioritas.join(','));
      if (selectedDiameterFilter && selectedDiameterFilter !== 'ALL') params.set('diameter', String(selectedDiameterFilter));
      
      const allSearch = [...selectedSearchLocations, ...(searchQuery.trim() ? [searchQuery.trim()] : [])].join(',');
      if (allSearch) params.set('search', allSearch);

      const [summaryRes, monitoringRes] = await Promise.all([
        fetch(`/api/gorong-gorong/summary?${params.toString()}`).then((r) => r.json()),
        fetch(`/api/gorong-gorong/monitoring?${params.toString()}`).then((r) => r.json()),
      ]);

      if (summaryRes.success) setSummaryData(summaryRes.data);
      if (monitoringRes.success) setMonitoringData(monitoringRes.data);
    } catch (err) {
      console.error('Error fetching gorong-gorong data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedWilayah, selectedStatus, selectedYears, selectedPrioritas, selectedDiameterFilter, selectedSearchLocations]);

  const kpi = summaryData?.kpi || {
    orderYearly: 0,
    terpasangYearly: 0,
    saldoCurrent: 0,
    pctKedatangan: 0,
    pctPemasangan: 0,
  };

  const listLokasiOrder = monitoringData?.listLokasiOrder || [];
  const listLokasiBelumOrder = monitoringData?.listLokasiBelumOrder || [];

  // Detail Modal / Drawer Master Data Status Lokasi
  const [selectedDetailLokasi, setSelectedDetailLokasi] = useState<string | null>(null);
  const selectedOrderRow = useMemo(() => {
    if (!selectedDetailLokasi) return null;
    return listLokasiOrder.find((item: any) => item.lokasi === selectedDetailLokasi) || null;
  }, [selectedDetailLokasi, listLokasiOrder]);

  // Sorting state untuk Tabel List Lokasi Order
  const [sortBy, setSortBy] = useState<string>('default');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string, direction?: 'asc' | 'desc') => {
    if (direction) {
      setSortBy(field);
      setSortOrder(direction);
    } else if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      // Atur default arah sort:
      // Akt. BK, DSM BK, DSM ST -> desc
      // Prioritas, Status, Tgl Order -> asc
      if (['aktBk', 'dsmBk', 'dsmSt'].includes(field)) {
        setSortOrder('desc');
      } else {
        setSortOrder('asc');
      }
    }
  };

  // Helper Header Sort Icon (Panah Chevron Up & Down seperti di Tabel Data Lahan)
  const renderSortArrows = (field: string) => {
    const isFieldActive = sortBy === field;
    return (
      <span className="inline-flex flex-col ml-1 shrink-0 align-middle">
        <span
          role="button"
          tabIndex={0}
          title={field === 'tanggalOrder' ? 'Oldest ke Newest (Naik)' : field === 'prioritas' ? 'Prioritas 1-5 (Naik)' : 'Urutkan Naik (A-Z / Kecil-Besar)'}
          onClick={(e) => {
            e.stopPropagation();
            handleSort(field, 'asc');
          }}
          className="p-0 cursor-pointer leading-none"
        >
          <ChevronUp
            className={`w-2.5 h-2.5 -mb-0.5 transition-colors ${
              isFieldActive && sortOrder === 'asc'
                ? 'text-[#00873D] dark:text-emerald-400 font-extrabold stroke-[3]'
                : 'text-slate-300 dark:text-slate-600 hover:text-emerald-500'
            }`}
          />
        </span>
        <span
          role="button"
          tabIndex={0}
          title={field === 'tanggalOrder' ? 'Newest ke Oldest (Turun)' : field === 'prioritas' ? 'Prioritas 5-1 (Turun)' : 'Urutkan Turun (Z-A / Besar-Kecil)'}
          onClick={(e) => {
            e.stopPropagation();
            handleSort(field, 'desc');
          }}
          className="p-0 cursor-pointer leading-none"
        >
          <ChevronDown
            className={`w-2.5 h-2.5 transition-colors ${
              isFieldActive && sortOrder === 'desc'
                ? 'text-[#00873D] dark:text-emerald-400 font-extrabold stroke-[3]'
                : 'text-slate-300 dark:text-slate-600 hover:text-emerald-500'
            }`}
          />
        </span>
      </span>
    );
  };

  // Sorting state untuk Tabel List Lokasi Belum Order
  const [belumSortBy, setBelumSortBy] = useState<string>('default');
  const [belumSortOrder, setBelumSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleBelumSort = (field: string, direction?: 'asc' | 'desc') => {
    if (direction) {
      setBelumSortBy(field);
      setBelumSortOrder(direction);
    } else if (belumSortBy === field) {
      setBelumSortOrder(belumSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setBelumSortBy(field);
      if (['aktBk'].includes(field)) {
        setBelumSortOrder('desc');
      } else {
        setBelumSortOrder('asc');
      }
    }
  };

  const renderBelumSortArrows = (field: string) => {
    const isFieldActive = belumSortBy === field;
    return (
      <span className="inline-flex flex-col ml-1 shrink-0 align-middle">
        <span
          role="button"
          tabIndex={0}
          title="Urutkan Naik (A-Z / Kecil-Besar)"
          onClick={(e) => {
            e.stopPropagation();
            handleBelumSort(field, 'asc');
          }}
          className="p-0 cursor-pointer leading-none"
        >
          <ChevronUp
            className={`w-2.5 h-2.5 -mb-0.5 transition-colors ${
              isFieldActive && belumSortOrder === 'asc'
                ? 'text-[#F58220] font-extrabold stroke-[3]'
                : 'text-slate-300 dark:text-slate-600 hover:text-amber-500'
            }`}
          />
        </span>
        <span
          role="button"
          tabIndex={0}
          title="Urutkan Turun (Z-A / Besar-Kecil)"
          onClick={(e) => {
            e.stopPropagation();
            handleBelumSort(field, 'desc');
          }}
          className="p-0 cursor-pointer leading-none"
        >
          <ChevronDown
            className={`w-2.5 h-2.5 transition-colors ${
              isFieldActive && belumSortOrder === 'desc'
                ? 'text-[#F58220] font-extrabold stroke-[3]'
                : 'text-slate-300 dark:text-slate-600 hover:text-amber-500'
            }`}
          />
        </span>
      </span>
    );
  };

  // Kumpulan seluruh nama lokasi yang tersedia untuk auto-suggest
  const allAvailableLocations = useMemo(() => {
    if (masterLocationsList.length > 0) {
      return masterLocationsList;
    }
    const set = new Set<string>();
    for (const item of listLokasiOrder) {
      if (item.lokasi && typeof item.lokasi === 'string') set.add(item.lokasi.trim());
    }
    for (const item of listLokasiBelumOrder) {
      if (item.lokasi && typeof item.lokasi === 'string') set.add(item.lokasi.trim());
    }
    return Array.from(set).sort();
  }, [masterLocationsList, listLokasiOrder, listLokasiBelumOrder]);

  const searchSuggestions = useMemo(() => {
    const q = searchQuery.toUpperCase().trim();
    if (!q) {
      return allAvailableLocations.filter((loc) => !selectedSearchLocations.includes(loc)).slice(0, 30);
    }
    return allAvailableLocations
      .filter((loc) => loc.toUpperCase().includes(q) && !selectedSearchLocations.includes(loc))
      .slice(0, 30);
  }, [allAvailableLocations, searchQuery, selectedSearchLocations]);

  // Urutkan Ringkasan per Wilayah dari terendah ke tertinggi (default persentase kedatangan terendah di atas, tertinggi di bawah)
  const sortedWilayahBreakdown = useMemo(() => {
    const list = [...(summaryData?.wilayahBreakdown || [])];
    return list.sort((a: any, b: any) => {
      if (a.pctKedatangan !== b.pctKedatangan) {
        return a.pctKedatangan - b.pctKedatangan;
      }
      return a.pctPasang - b.pctPasang;
    });
  }, [summaryData?.wilayahBreakdown]);

  // Kumpulan tahun yang tersedia secara dinamis dari data List Lokasi Order
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    for (const item of listLokasiOrder) {
      if (item.tahun && typeof item.tahun === 'string') {
        set.add(item.tahun.trim());
      } else if (item.tanggalOrder && item.tanggalOrder !== '-') {
        set.add(item.tanggalOrder.slice(0, 4));
      }
    }
    if (set.size === 0) set.add('2026');
    return Array.from(set).sort().reverse();
  }, [listLokasiOrder]);

  // Filter client-side untuk pencarian cepat & multi-tier sorting
  const filteredOrderList = useMemo(() => {
    let list = listLokasiOrder;
    const hasSearchLocations = selectedSearchLocations.length > 0;
    const q = searchQuery.toUpperCase().trim();

    // Filter berdasarkan tahun yang dipilih
    if (selectedYears.length > 0) {
      list = list.filter((item: any) => {
        const itemYear = String(
          item.tahun || (item.tanggalOrder && item.tanggalOrder !== '-' ? item.tanggalOrder.slice(0, 4) : '2026')
        );
        return selectedYears.includes(itemYear);
      });
    }

    // Filter berdasarkan prioritas yang dipilih
    if (selectedPrioritas.length > 0) {
      list = list.filter((item: any) => {
        const itemPrio = String(item.prioritas || '').trim();
        return selectedPrioritas.includes(itemPrio);
      });
    }

    // Filter berdasarkan status yang dipilih (Open -> '-' atau 'Open', Close -> 'Close')
    if (selectedStatus.length > 0) {
      list = list.filter((item: any) => {
        const itemStatus = String(item.statusAll || '').trim().toUpperCase();
        return selectedStatus.some((st) => {
          const upper = st.toUpperCase();
          if (upper === 'OPEN' || upper === '-') {
            return itemStatus === '-' || itemStatus === 'OPEN' || itemStatus === '';
          }
          if (upper === 'CLOSE') {
            return itemStatus === 'CLOSE';
          }
          return itemStatus === upper;
        });
      });
    }

    if (hasSearchLocations || q) {
      list = list.filter((item: any) => {
        const itemLok = (item.lokasi || '').toUpperCase();
        const itemWil = (item.wilayah || '').toUpperCase();

        const matchSelected = hasSearchLocations
          ? selectedSearchLocations.some(
              (sel) => itemLok.includes(sel.toUpperCase()) || itemWil.includes(sel.toUpperCase())
            )
          : false;

        const matchQuery = q ? (itemLok.includes(q) || itemWil.includes(q)) : false;

        if (hasSearchLocations && q) {
          return matchSelected || matchQuery;
        }
        return hasSearchLocations ? matchSelected : matchQuery;
      });
    }

    const prioOrder: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '-': 6, '': 7 };

    const sorted = [...list].sort((a: any, b: any) => {
      // 7 Kolom Eksisting: Pertahankan Sesuai Aslinya (Jangan Diotak-Atik)
      if (sortBy === 'prioritas') {
        const pA = prioOrder[a.prioritas] ?? 99;
        const pB = prioOrder[b.prioritas] ?? 99;
        if (pA !== pB) return sortOrder === 'asc' ? pA - pB : pB - pA;
      } else if (sortBy === 'status') {
        const sA = a.status || '';
        const sB = b.status || '';
        const cmp = sA.localeCompare(sB);
        if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
      } else if (sortBy === 'aktBk') {
        const aA = a.aktBk || '';
        const aB = b.aktBk || '';
        const cmp = aA.localeCompare(aB);
        if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
      } else if (sortBy === 'dsmBk') {
        const dBkA = a.dsmBk || '';
        const dBkB = b.dsmBk || '';
        const cmp = dBkA.localeCompare(dBkB);
        if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
      } else if (sortBy === 'dsmSt') {
        const dStA = a.dsmSt || '';
        const dStB = b.dsmSt || '';
        const cmp = dStA.localeCompare(dStB);
        if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
      } else if (sortBy === 'tanggalOrder') {
        const tA = a.tanggalOrder === '-' ? (sortOrder === 'asc' ? '9999-99-99' : '0000-00-00') : a.tanggalOrder;
        const tB = b.tanggalOrder === '-' ? (sortOrder === 'asc' ? '9999-99-99' : '0000-00-00') : b.tanggalOrder;
        const cmp = tA.localeCompare(tB);
        if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
      } else if (sortBy === 'lokasi') {
        const cmp = a.lokasi.localeCompare(b.lokasi);
        if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
      }
      // Kolom Tambahan yang Ditambahkan Fitur Sort
      else if (sortBy === 'wilayah') {
        const cmp = (a.wilayah || '').localeCompare(b.wilayah || '');
        if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
      } else if (sortBy === 'luas') {
        const lA = Number(a.luasNetto ?? a.luas ?? 0);
        const lB = Number(b.luasNetto ?? b.luas ?? 0);
        if (lA !== lB) return sortOrder === 'asc' ? lA - lB : lB - lA;
      } else if (sortBy === 'umurBulan') {
        const uA = Number(a.umurBulan ?? 0);
        const uB = Number(b.umurBulan ?? 0);
        if (uA !== uB) return sortOrder === 'asc' ? uA - uB : uB - uA;
      } else if (sortBy === 'statusAll') {
        const cmp = (a.statusAll || '').localeCompare(b.statusAll || '');
        if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
      } else if (sortBy === 'ratioPerHa') {
        const rA = Number(a.ratioPerHa ?? 0);
        const rB = Number(b.ratioPerHa ?? 0);
        if (rA !== rB) return sortOrder === 'asc' ? rA - rB : rB - rA;
      } else if (
        sortBy.startsWith('d40_') ||
        sortBy.startsWith('d60_') ||
        sortBy.startsWith('d80_') ||
        sortBy.startsWith('d100_')
      ) {
        const parts = sortBy.split('_');
        const diaKey = parts[0]; // 'd40' | 'd60' | 'd80' | 'd100'
        const col = parts.slice(1).join('_');
        const objA = a[diaKey] || {};
        const objB = b[diaKey] || {};

        if (col === 'order') {
          const vA = Number(objA.order ?? 0);
          const vB = Number(objB.order ?? 0);
          if (vA !== vB) return sortOrder === 'asc' ? vA - vB : vB - vA;
        } else if (col === 'drop') {
          const vA = Number(objA.drop ?? 0);
          const vB = Number(objB.drop ?? 0);
          if (vA !== vB) return sortOrder === 'asc' ? vA - vB : vB - vA;
        } else if (col === 'tglDrop') {
          const vA =
            objA.tglTerakhirDrop === '-' || !objA.tglTerakhirDrop
              ? sortOrder === 'asc'
                ? '9999-99-99'
                : '0000-00-00'
              : objA.tglTerakhirDrop;
          const vB =
            objB.tglTerakhirDrop === '-' || !objB.tglTerakhirDrop
              ? sortOrder === 'asc'
                ? '9999-99-99'
                : '0000-00-00'
              : objB.tglTerakhirDrop;
          const cmp = vA.localeCompare(vB);
          if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
        } else if (col === 'sisa') {
          const vA = Number(objA.sisaKebutuhan ?? 0);
          const vB = Number(objB.sisaKebutuhan ?? 0);
          if (vA !== vB) return sortOrder === 'asc' ? vA - vB : vB - vA;
        } else if (col === 'pctDtg') {
          const vA = Number(objA.pctKedatangan ?? 0);
          const vB = Number(objB.pctKedatangan ?? 0);
          if (vA !== vB) return sortOrder === 'asc' ? vA - vB : vB - vA;
        } else if (col === 'pasangManual') {
          const vA = Number(objA.pasangManual ?? 0);
          const vB = Number(objB.pasangManual ?? 0);
          if (vA !== vB) return sortOrder === 'asc' ? vA - vB : vB - vA;
        } else if (col === 'pasangSap') {
          const vA = Number(objA.pasangSap ?? 0);
          const vB = Number(objB.pasangSap ?? 0);
          if (vA !== vB) return sortOrder === 'asc' ? vA - vB : vB - vA;
        } else if (col === 'saldo') {
          const vA = Number(objA.saldo ?? 0);
          const vB = Number(objB.saldo ?? 0);
          if (vA !== vB) return sortOrder === 'asc' ? vA - vB : vB - vA;
        } else if (col === 'pctPasang') {
          const vA = Number(objA.pctPasang ?? 0);
          const vB = Number(objB.pctPasang ?? 0);
          if (vA !== vB) return sortOrder === 'asc' ? vA - vB : vB - vA;
        } else if (col === 'status') {
          const vA = objA.status || '';
          const vB = objB.status || '';
          const cmp = vA.localeCompare(vB);
          if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
        }
      }

      // Default Multi-Tier Sorting:
      // 1. Prioritas 1-5 (Ascending)
      // 2. Status (Ascending)
      // 3. Akt. BK (Descending)
      // 4. DSM BK & DSM ST (Descending)
      // 5. Tgl Order (Oldest ke Newest)
      // 6. Lokasi (Ascending)
      const pA = prioOrder[a.prioritas] ?? 99;
      const pB = prioOrder[b.prioritas] ?? 99;
      if (pA !== pB) return pA - pB;

      const stCmp = (a.status || '').localeCompare(b.status || '');
      if (stCmp !== 0) return stCmp;

      const aktCmp = (b.aktBk || '').localeCompare(a.aktBk || '');
      if (aktCmp !== 0) return aktCmp;

      const dsmBkCmp = (b.dsmBk || '').localeCompare(a.dsmBk || '');
      if (dsmBkCmp !== 0) return dsmBkCmp;

      const dsmStCmp = (b.dsmSt || '').localeCompare(a.dsmSt || '');
      if (dsmStCmp !== 0) return dsmStCmp;

      const tglA = a.tanggalOrder === '-' ? '9999-99-99' : a.tanggalOrder;
      const tglB = b.tanggalOrder === '-' ? '9999-99-99' : b.tanggalOrder;
      const tglCmp = tglA.localeCompare(tglB);
      if (tglCmp !== 0) return tglCmp;

      return a.lokasi.localeCompare(b.lokasi);
    });

    return sorted;
  }, [listLokasiOrder, selectedSearchLocations, searchQuery, sortBy, sortOrder, selectedYears, selectedPrioritas, selectedStatus]);

  const filteredBelumOrderList = useMemo(() => {
    let list = listLokasiBelumOrder;
    const hasSearchLocations = selectedSearchLocations.length > 0;
    const q = searchQuery.toUpperCase().trim();

    if (hasSearchLocations || q) {
      list = list.filter((item: any) => {
        const itemLok = (item.lokasi || '').toUpperCase();
        const itemWil = (item.wilayah || '').toUpperCase();

        const matchSelected = hasSearchLocations
          ? selectedSearchLocations.some(
              (sel) => itemLok.includes(sel.toUpperCase()) || itemWil.includes(sel.toUpperCase())
            )
          : false;

        const matchQuery = q ? (itemLok.includes(q) || itemWil.includes(q)) : false;

        if (hasSearchLocations && q) {
          return matchSelected || matchQuery;
        }
        return hasSearchLocations ? matchSelected : matchQuery;
      });
    }

    const sorted = [...list].sort((a: any, b: any) => {
      if (belumSortBy === 'wilayah') {
        const cmp = (a.wilayah || '').localeCompare(b.wilayah || '');
        if (cmp !== 0) return belumSortOrder === 'asc' ? cmp : -cmp;
      } else if (belumSortBy === 'lokasi') {
        const cmp = (a.lokasi || '').localeCompare(b.lokasi || '');
        if (cmp !== 0) return belumSortOrder === 'asc' ? cmp : -cmp;
      } else if (belumSortBy === 'luasNetto') {
        const lA = Number(a.luasNetto ?? 0);
        const lB = Number(b.luasNetto ?? 0);
        if (lA !== lB) return belumSortOrder === 'asc' ? lA - lB : lB - lA;
      } else if (belumSortBy === 'status') {
        const cmp = (a.status || '').localeCompare(b.status || '');
        if (cmp !== 0) return belumSortOrder === 'asc' ? cmp : -cmp;
      } else if (belumSortBy === 'aktBk') {
        const stepA = typeof a.stepOrder === 'number' ? a.stepOrder : 99;
        const stepB = typeof b.stepOrder === 'number' ? b.stepOrder : 99;
        if (stepA !== stepB) return belumSortOrder === 'asc' ? stepA - stepB : stepB - stepA;
        const cmp = (a.aktBk || '').localeCompare(b.aktBk || '');
        if (cmp !== 0) return belumSortOrder === 'asc' ? cmp : -cmp;
      }

      // Default sorting: Wilayah asc, lalu Lokasi asc
      const wCmp = (a.wilayah || '').localeCompare(b.wilayah || '');
      if (wCmp !== 0) return wCmp;
      return (a.lokasi || '').localeCompare(b.lokasi || '');
    });

    return sorted;
  }, [listLokasiBelumOrder, selectedSearchLocations, searchQuery, belumSortBy, belumSortOrder]);

  // Ringkasan untuk 4 Card List Lokasi Belum Order (Wilayah, Lokasi, Luas Ha, Status)
  const belumOrderSummary = useMemo(() => {
    const wilSet = new Set<string>();
    let totalLuas = 0;

    for (const item of filteredBelumOrderList) {
      if (item.wilayah && item.wilayah !== '-') wilSet.add(item.wilayah);
      totalLuas += Number(item.luasNetto || 0);
    }

    return {
      totalWilayah: wilSet.size,
      totalLokasi: filteredBelumOrderList.length,
      totalLuas: totalLuas.toFixed(2),
    };
  }, [filteredBelumOrderList]);

  // Helper badge prioritas (Hanya angka prioritas: 1 - 5, tanpa 'P' dan tanpa '()')
  const renderPriorityBadge = (prio: string) => {
    switch (prio) {
      case '1':
        return (
          <span
            title="Prioritas 1: FC (Kritis, belum ada drop)"
            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-2xs"
          >
            1
          </span>
        );
      case '2':
        return (
          <span
            title="Prioritas 2: Jalan & Saluran (Tinggi, belum ada drop)"
            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-2xs"
          >
            2
          </span>
        );
      case '3':
        return (
          <span
            title="Prioritas 3: Jalan & Saluran (Sedang, sudah ada drop)"
            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-black bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30 shadow-2xs"
          >
            3
          </span>
        );
      case '4':
        return (
          <span
            title="Prioritas 4: FC (Selesai Tanam, sudah ada drop)"
            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-2xs"
          >
            4
          </span>
        );
      case '5':
        return (
          <span
            title="Prioritas 5: Masih proses tanam belum FC"
            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs"
          >
            5
          </span>
        );
      case '':
      case '-':
        return <span className="text-slate-400 dark:text-slate-600 font-medium">-</span>;
      default:
        return <span className="text-slate-500 font-bold">{prio}</span>;
    }
  };

  // Export Excel (.xlsx) dengan header biru muda, rapi, dan filter aktif
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('tab', activeTableTab);
      if (selectedWilayah.length > 0) params.set('wilayah', selectedWilayah.join(','));
      if (selectedStatus.length > 0) params.set('status', selectedStatus.join(','));
      if (selectedYears.length > 0) params.set('tahun', selectedYears.join(','));
      if (selectedPrioritas.length > 0) params.set('prioritas', selectedPrioritas.join(','));
      if (selectedDiameterFilter && selectedDiameterFilter !== 'ALL') params.set('diameter', String(selectedDiameterFilter));
      
      const allSearch = [...selectedSearchLocations, ...(searchQuery.trim() ? [searchQuery.trim()] : [])].join(',');
      if (allSearch) params.set('search', allSearch);

      const res = await fetch(`/api/gorong-gorong/export?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal mengunduh berkas Excel');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = activeTableTab === 'order'
        ? `Monitoring_Gorong_Gorong_List_Order_${dateStr}.xlsx`
        : `Monitoring_Gorong_Gorong_Belum_Order_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error exporting Excel:', err);
      alert(err.message || 'Gagal mengekspor file Excel');
    } finally {
      setIsExporting(false);
    }
  };

  // Upload Excel (.xlsx/.xls) dengan mode Smart Merge atau Full Replace
  const handleUploadExcel = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setUploadError('File harus berupa dokumen Excel (.xlsx / .xls)');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', uploadMode);
      formData.append('uploadedBy', 'Admin');

      const res = await fetch('/api/gorong-gorong/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setUploadResult(data.summary);
        // Refresh seluruh data dashboard, kartu KPI, grafik, dan kedua tabel secara real-time
        await loadData(true);
      } else {
        setUploadError(data.message || 'Gagal memproses file Excel.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Terjadi kesalahan saat mengunggah file.');
    } finally {
      setIsUploading(false);
      if (fileUploadInputRef.current) fileUploadInputRef.current.value = '';
    }
  };

  const handleDragUpload = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDropUpload = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadExcel(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. HEADER SECTION & FILTER BAR */}
      <div className="relative z-30 flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-xs backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00873D] shadow-[0_0_8px_#00873D]" />
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Monitoring Saldo & Kebutuhan Gorong-Gorong PG1
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Pemantauan real-time rekapitulasi order, kedatangan (drop), realisasi pasang (manual & SAP), serta saldo fisik di lapangan per lokasi.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-nowrap py-0.5">
          {/* Tombol Page Diameter (Semua Diameter, Ø40, Ø60, Ø80, Ø100) */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => setSelectedDiameterFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedDiameterFilter === 'ALL'
                  ? 'bg-[#00873D] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua
            </button>
            {[40, 60, 80, 100].map((dia) => (
              <button
                key={dia}
                type="button"
                onClick={() => setSelectedDiameterFilter(dia)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedDiameterFilter === dia
                    ? 'bg-[#00873D] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Ø{dia}
              </button>
            ))}
          </div>

          {/* Filter Wilayah (Multi-select popup) */}
          <div className={`relative wilayah-filter-container shrink-0 ${isWilayahDropdownOpen ? 'z-50' : 'z-20'}`}>
            <button
              type="button"
              onClick={() => {
                setIsWilayahDropdownOpen((prev) => !prev);
                setIsStatusDropdownOpen(false);
                setIsYearDropdownOpen(false);
              }}
              title={selectedWilayah.length === 0 ? 'Semua Wilayah' : selectedWilayah.join(', ')}
              className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
            >
              <span className="truncate max-w-[120px]">
                {selectedWilayah.length === 0
                  ? 'Semua Wilayah'
                  : selectedWilayah.length === 1
                  ? selectedWilayah[0]
                  : `${selectedWilayah.length} Wilayah`}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                  isWilayahDropdownOpen ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </button>

            {isWilayahDropdownOpen && (
              <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-36 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWilayah([]);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                    selectedWilayah.length === 0 ? 'text-[#00873D] font-bold bg-emerald-50/50 dark:bg-emerald-950/30' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>Semua Wilayah</span>
                  {selectedWilayah.length === 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#00873D]" />}
                </button>
                {['AW01', 'AW02', 'AW03', 'AW04', 'AW05', 'AW06', 'AW07'].map((w) => {
                  const isSelected = selectedWilayah.includes(w);
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        setSelectedWilayah((prev) =>
                          prev.includes(w) ? prev.filter((item) => item !== w) : [...prev, w]
                        );
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                        isSelected ? 'text-[#00873D] font-bold bg-emerald-50/50 dark:bg-emerald-950/30' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{w}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#00873D]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Group Action Buttons: Export Excel & Upload Excel (Selalu Berdampingan Rapi Sejajar) */}
          <div className="inline-flex items-center gap-2 shrink-0 flex-nowrap">
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00873D] hover:bg-[#006e31] text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
              title="Export data tabel ke file Excel (.xlsx) dengan format rapi dan filter aktif"
            >
              <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Mengekspor...' : 'Export Excel'}</span>
            </button>

            <button
              onClick={() => {
                setIsUploadModalOpen(true);
                setUploadResult(null);
                setUploadError(null);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer shrink-0 whitespace-nowrap"
              title="Upload file Excel untuk memperbarui data Monitor Gorong-Gorong (Full Replace atau Update Parsial)"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. BARIS 5 KARTU KPI SUMMARIZED (YEARLY & CURRENT) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Jumlah Order (Yearly) */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 shadow-xs backdrop-blur-sm group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              Total Order
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {kpi.orderYearly.toLocaleString('id-ID')}
              <span className="text-xs font-semibold text-slate-500 ml-1.5">pcs</span>
            </div>
            <p className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Transaksi Tahun 2026
            </p>
          </div>
        </div>

        {/* Card 2: Jumlah Terpasang (Yearly) */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 shadow-xs backdrop-blur-sm group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
              Total Terpasang
            </span>
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {kpi.terpasangYearly.toLocaleString('id-ID')}
              <span className="text-xs font-semibold text-slate-500 ml-1.5">pcs</span>
            </div>
            <p className="text-[10.5px] text-blue-600 dark:text-blue-400 font-medium mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Realisasi Tahun 2026
            </p>
          </div>
        </div>

        {/* Card 3: Saldo di Lokasi (Current) */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 shadow-xs backdrop-blur-sm group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
              Saldo di Lokasi
            </span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {kpi.saldoCurrent.toLocaleString('id-ID')}
              <span className="text-xs font-semibold text-slate-500 ml-1.5">pcs</span>
            </div>
            <p className="text-[10.5px] text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Status Open di semua tahun
            </p>
          </div>
        </div>

        {/* Card 4: % Kedatangan */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 shadow-xs backdrop-blur-sm group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
              % Kedatangan
            </span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {kpi.pctKedatangan}%
            </div>
            <p className="text-[10.5px] text-purple-600 dark:text-purple-400 font-medium mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Rasio Drop vs Order (Status Open)
            </p>
          </div>
        </div>

        {/* Card 5: % Pemasangan */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent border border-teal-500/20 shadow-xs backdrop-blur-sm group hover:border-teal-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
              % Pemasangan
            </span>
            <div className="p-2 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {kpi.pctPemasangan}%
            </div>
            <p className="text-[10.5px] text-teal-600 dark:text-teal-400 font-medium mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Rasio Pasang vs Drop (Status Open)
            </p>
          </div>
        </div>
      </div>

      {/* 3. PANEL GRAFIK KOMPARASI & TREN TERPADU (BULANAN & AW01-AW07) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik Utama: Combo Chart Dual-Axis (2 Kolom) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-xs backdrop-blur-md flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {chartViewMode === 'monthly' ? (
                  <>
                    <BarChart3 className="w-4 h-4 text-[#00873D]" />
                    <span>Tren Bulanan: Order vs Kedatangan (Drop) vs Terpasang</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 text-[#009EE2]" />
                    <span>Pemenuhan per Wilayah: AW01 s/d AW07</span>
                  </>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {chartViewMode === 'monthly'
                  ? 'Pergerakan volume fisik (Order, Drop, Pasang) serta laju % Kedatangan & % Pasang per bulan'
                  : 'Komparasi volume fisik (Order, Drop, Pasang) serta laju % Kedatangan & % Pasang per wilayah kebun'}
              </p>
            </div>

            {/* Tab Switcher: Tren Bulanan vs Per Wilayah (AW01 - AW07) */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartViewMode('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartViewMode === 'monthly'
                    ? 'bg-[#00873D] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Tren Bulanan</span>
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('wilayah')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartViewMode === 'wilayah'
                    ? 'bg-[#00873D] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Per Wilayah (AW01 - AW07)</span>
              </button>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartViewMode === 'monthly' ? (summaryData?.monthlyData || []) : (summaryData?.wilayahBreakdown || [])}
                margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey={chartViewMode === 'monthly' ? 'month' : 'wilayah'}
                  tick={{ fontSize: 11, fontWeight: 600 }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val: number) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(val))}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  unit="%"
                  tick={{ fontSize: 11 }}
                  stroke="#8B5CF6"
                  domain={[0, (dataMax: number) => Math.max(100, Math.ceil(dataMax * 1.15))]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                  }}
                  formatter={(value: any, name: any) => {
                    if (name === '% Kedatangan' || name === '% Pasang') {
                      return [`${value}%`, name];
                    }
                    if (name === 'Order') {
                      return [`${Number(value).toLocaleString('id-ID')} pcs`, name];
                    }
                    return [`${Number(value).toLocaleString('id-ID')} pcs`, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar yAxisId="left" dataKey="order" name="Order" fill="#F58220" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar yAxisId="left" dataKey="drop" name="Drop (Kedatangan)" fill="#00873D" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar
                  yAxisId="left"
                  dataKey="totalPasang"
                  name="Terpasang"
                  fill="#009EE2"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Line
                  yAxisId="right"
                  type="linear"
                  dataKey="pctKedatangan"
                  name="% Kedatangan"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#8B5CF6', strokeWidth: 1.5, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="right"
                  type="linear"
                  dataKey="pctPasang"
                  name="% Pasang"
                  stroke="#0D9488"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#0D9488', strokeWidth: 1.5, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel Samping: Rincian Cepat Pemenuhan per Wilayah (1 Kolom) */}
        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-xs backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#009EE2]" />
                Ringkasan per Wilayah
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                AW01 - AW07
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">Persentase kedatangan dan pemasangan per wilayah kebun</p>
          </div>

          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {sortedWilayahBreakdown.map((w: any) => (
              <div
                key={w.wilayah}
                onClick={() => {
                  setSelectedWilayah((prev) =>
                    prev.includes(w.wilayah) ? prev.filter((item) => item !== w.wilayah) : [...prev, w.wilayah]
                  );
                }}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  selectedWilayah.includes(w.wilayah)
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-[#00873D]'
                    : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/60 dark:border-slate-700/60'
                }`}
                title={`Klik untuk filter tabel ke ${w.wilayah}`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-800 dark:text-slate-200 font-extrabold">{w.wilayah}</span>
                    {selectedWilayah.includes(w.wilayah) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00873D]" />
                    )}
                  </div>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {w.pasang} / {w.drop} pcs
                  </span>
                </div>
                {/* Progress bar ganda: Drop vs Pasang */}
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00873D] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, w.pctKedatangan)}%` }}
                      title={`% Kedatangan: ${w.pctKedatangan}%`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>
                      Kedatangan: <b className="text-emerald-600 dark:text-emerald-400">{w.pctKedatangan}%</b>
                    </span>
                    <span>
                      Terpasang: <b className="text-blue-600 dark:text-blue-400">{w.pctPasang}%</b>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. TAB PEMILIH TABEL DATA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab Button 1: List Lokasi Order */}
          <button
            onClick={() => setActiveTableTab('order')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTableTab === 'order'
                ? 'bg-[#00873D] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>List Lokasi Order</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
              {filteredOrderList.length}
            </span>
          </button>

          {/* Tab Button 2: List Lokasi Belum Order */}
          <button
            onClick={() => setActiveTableTab('belum_order')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTableTab === 'belum_order'
                ? 'bg-[#F58220] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>List Lokasi Belum Order</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
              {filteredBelumOrderList.length}
            </span>
          </button>

          {/* Filter Status (Dipindah posisinya disamping tombol List Lokasi Belum Order) */}
          <div className="relative status-filter-container">
            <button
              type="button"
              onClick={() => {
                setIsStatusDropdownOpen((prev) => !prev);
                setIsYearDropdownOpen(false);
                setIsWilayahDropdownOpen(false);
              }}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer transition-colors shadow-2xs"
            >
              <span>
                {selectedStatus.length === 0
                  ? 'Status'
                  : selectedStatus.join(', ')}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                  isStatusDropdownOpen ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-36 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => setSelectedStatus([])}
                  className={`w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                    selectedStatus.length === 0
                      ? 'text-[#00873D] font-bold bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>Semua Status</span>
                  {selectedStatus.length === 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#00873D]" />}
                </button>
                {['Open', 'Close'].map((st) => {
                  const isSelected = selectedStatus.includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setSelectedStatus((prev) =>
                          prev.includes(st) ? prev.filter((item) => item !== st) : [...prev, st]
                        );
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'text-[#00873D] font-bold bg-emerald-50/50 dark:bg-emerald-950/30'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{st}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#00873D]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filter Tahun (Multi-select popup di samping tombol Filter Status) */}
          <div className="relative year-filter-container">
            <button
              type="button"
              onClick={() => {
                setIsYearDropdownOpen((prev) => !prev);
                setIsStatusDropdownOpen(false);
                setIsWilayahDropdownOpen(false);
              }}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer transition-colors shadow-2xs"
            >
              <span>
                {selectedYears.length === 0
                  ? 'Tahun'
                  : selectedYears.join(', ')}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                  isYearDropdownOpen ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </button>

            {isYearDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-36 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => setSelectedYears([])}
                  className={`w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                    selectedYears.length === 0
                      ? 'text-[#00873D] font-bold bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>Semua Tahun</span>
                  {selectedYears.length === 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#00873D]" />}
                </button>
                {availableYears.map((yr) => {
                  const isSelected = selectedYears.includes(yr);
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setSelectedYears((prev) =>
                          prev.includes(yr) ? prev.filter((item) => item !== yr) : [...prev, yr]
                        );
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'text-[#00873D] font-bold bg-emerald-50/50 dark:bg-emerald-950/30'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{yr}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#00873D]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filter Prioritas (Multi-select popup di samping tombol Filter Tahun) */}
          <div className="relative prioritas-filter-container">
            <button
              type="button"
              onClick={() => {
                setIsPrioritasDropdownOpen((prev) => !prev);
                setIsYearDropdownOpen(false);
                setIsStatusDropdownOpen(false);
                setIsWilayahDropdownOpen(false);
              }}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer transition-colors shadow-2xs"
            >
              <span>
                {selectedPrioritas.length === 0
                  ? 'Prioritas'
                  : selectedPrioritas.length === 1
                  ? `Prioritas ${selectedPrioritas[0]}`
                  : `Prio: ${selectedPrioritas.join(', ')}`}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                  isPrioritasDropdownOpen ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </button>

            {isPrioritasDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-36 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => setSelectedPrioritas([])}
                  className={`w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                    selectedPrioritas.length === 0
                      ? 'text-[#00873D] font-bold bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>Semua Prioritas</span>
                  {selectedPrioritas.length === 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#00873D]" />}
                </button>
                {['1', '2', '3', '4', '5'].map((prio) => {
                  const isSelected = selectedPrioritas.includes(prio);
                  return (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => {
                        setSelectedPrioritas((prev) =>
                          prev.includes(prio) ? prev.filter((item) => item !== prio) : [...prev, prio]
                        );
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'text-[#00873D] font-bold bg-emerald-50/50 dark:bg-emerald-950/30'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>Prioritas {prio}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#00873D]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Multi-Search Box Cepat dengan Tags Lokasi & Tombol Silang Lingkaran */}
        <div className="relative w-full sm:w-80 multisearch-container">
          <div
            onClick={() => {
              setIsSearchDropdownOpen(true);
              searchInputRef.current?.focus();
            }}
            className="w-full min-h-[38px] px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-[#00873D] focus-within:border-transparent transition-all shadow-2xs"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            
            {/* Tag chips lokasi yang dipilih */}
            {selectedSearchLocations.map((loc) => (
              <span
                key={loc}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-[#00873D] dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold shadow-2xs"
              >
                <span>{loc}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSearchLocations((prev) => prev.filter((item) => item !== loc));
                  }}
                  className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-200 cursor-pointer p-0.5 transition-colors"
                  title={`Hapus filter ${loc}`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}

            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onClick={(e) => {
                e.stopPropagation();
                setIsSearchDropdownOpen(true);
              }}
              onFocus={() => setIsSearchDropdownOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  e.preventDefault();
                  const val = searchQuery.trim();
                  if (!selectedSearchLocations.includes(val)) {
                    setSelectedSearchLocations((prev) => [...prev, val]);
                  }
                  setSearchQuery('');
                  setIsSearchDropdownOpen(true);
                } else if (e.key === 'Backspace' && !searchQuery && selectedSearchLocations.length > 0) {
                  setSelectedSearchLocations((prev) => prev.slice(0, -1));
                }
              }}
              placeholder="Cari Lokasi"
              className="flex-1 min-w-[100px] bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400 py-1"
            />

            {(selectedSearchLocations.length > 0 || searchQuery) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSearchLocations([]);
                  setSearchQuery('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5 shrink-0"
                title="Hapus semua pencarian"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown saran autocomplete lokasi */}
          {isSearchDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Saran Lokasi ({searchSuggestions.length})
              </div>
              {searchSuggestions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400 text-center">
                  Lokasi tidak ditemukan
                </div>
              ) : (
                searchSuggestions.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      if (!selectedSearchLocations.includes(loc)) {
                        setSelectedSearchLocations((prev) => [...prev, loc]);
                      }
                      setSearchQuery('');
                      setIsSearchDropdownOpen(false);
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-[#00873D] transition-colors flex items-center justify-between"
                  >
                    <span>{loc}</span>
                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. KONTEN TABEL */}
      {activeTableTab === 'order' ? (
        /* TABEL 1: LIST LOKASI ORDER LENGKAP DENGAN 4 DIAMETER */
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-h-[620px] scrollbar-thin border border-slate-200 dark:border-slate-800">
            <table className="w-full text-center border-separate border-spacing-0 text-[11px] whitespace-nowrap">
              {/* Header 2 Tingkat */}
              <thead className="text-slate-700 dark:text-slate-200 font-bold">
                {/* Baris Header Atas */}
                <tr className="h-[34px]">
                  {/* Kolom 1-11 Ter-Freeze dari No sampai Prioritas */}
                  <th
                    rowSpan={2}
                    className="sticky top-0 left-0 z-50 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 w-[45px] min-w-[45px] max-w-[45px] text-center px-1 py-2 font-bold"
                  >
                    No
                  </th>
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('lokasi')}
                    className="sticky top-0 left-[45px] z-50 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 w-[85px] min-w-[85px] max-w-[85px] px-2 py-2 font-bold cursor-pointer select-none text-center"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Lokasi</span>
                      {renderSortArrows('lokasi')}
                    </div>
                  </th>
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('wilayah')}
                    className="sticky top-0 left-[130px] z-40 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 w-[55px] min-w-[55px] max-w-[55px] px-1 py-2 text-center font-bold cursor-pointer select-none"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Wil</span>
                      {renderSortArrows('wilayah')}
                    </div>
                  </th>
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('luas')}
                    className="sticky top-0 left-[185px] z-40 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 w-[60px] min-w-[60px] max-w-[60px] px-1 py-2 text-center font-bold cursor-pointer select-none"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Luas</span>
                      {renderSortArrows('luas')}
                    </div>
                  </th>
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('status')}
                    className="sticky top-0 left-[245px] z-40 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 w-[75px] min-w-[75px] max-w-[75px] px-1 py-2 cursor-pointer select-none text-center font-bold"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Status</span>
                      {renderSortArrows('status')}
                    </div>
                  </th>
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('umurBulan')}
                    className="sticky top-0 left-[320px] z-40 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 w-[65px] min-w-[65px] max-w-[65px] px-1 py-2 text-center font-bold cursor-pointer select-none"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Umur Bln</span>
                      {renderSortArrows('umurBulan')}
                    </div>
                  </th>
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('tanggalOrder')}
                    title="Urutkan Tanggal Order (Oldest ke Newest / Sebaliknya)"
                    className="sticky top-0 left-[385px] z-40 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 w-[85px] min-w-[85px] max-w-[85px] px-1 py-2 cursor-pointer select-none text-center font-bold"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Tgl Order</span>
                      {renderSortArrows('tanggalOrder')}
                    </div>
                  </th>
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('aktBk')}
                    className="sticky top-0 left-[470px] z-40 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 w-[155px] min-w-[155px] max-w-[155px] px-2 py-2 cursor-pointer select-none text-center font-bold"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Akt. BK</span>
                      {renderSortArrows('aktBk')}
                    </div>
                  </th>
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('dsmBk')}
                    className="sticky top-0 left-[625px] z-40 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 w-[70px] min-w-[70px] max-w-[70px] px-1 py-2 cursor-pointer select-none text-center font-bold"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>DSM BK</span>
                      {renderSortArrows('dsmBk')}
                    </div>
                  </th>
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('dsmSt')}
                    className="sticky top-0 left-[695px] z-40 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 w-[70px] min-w-[70px] max-w-[70px] px-1 py-2 cursor-pointer select-none text-center font-bold"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>DSM ST</span>
                      {renderSortArrows('dsmSt')}
                    </div>
                  </th>
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('prioritas')}
                    title="Urutkan Prioritas 1-5"
                    className="sticky top-0 left-[765px] z-40 bg-slate-100 dark:bg-slate-800 border-r-2 border-b border-slate-300 dark:border-slate-700 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.12)] w-[70px] min-w-[70px] max-w-[70px] px-1 py-2 cursor-pointer select-none text-center font-bold"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Prioritas</span>
                      {renderSortArrows('prioritas')}
                    </div>
                  </th>

                  {/* Kolom Bebas Scroll ke Samping */}
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('statusAll')}
                    className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 px-2.5 py-2 text-center font-bold w-[75px] min-w-[75px] cursor-pointer select-none"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Status All</span>
                      {renderSortArrows('statusAll')}
                    </div>
                  </th>
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('ratioPerHa')}
                    className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 border-r-2 border-b border-slate-300 dark:border-slate-700 px-2.5 py-2 text-center font-bold w-[70px] min-w-[70px] cursor-pointer select-none"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Ratio/Ha</span>
                      {renderSortArrows('ratioPerHa')}
                    </div>
                  </th>

                  {/* 4 Grup Diameter Header (100% Solid Warna Pekat) */}
                  <th colSpan={10} className="sticky top-0 z-30 px-3 py-2 text-center border-r-2 border-b border-slate-300 dark:border-slate-700 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                    DIAMETER 40 CM (Ø40)
                  </th>
                  <th colSpan={10} className="sticky top-0 z-30 px-3 py-2 text-center border-r-2 border-b border-slate-300 dark:border-slate-700 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">
                    DIAMETER 60 CM (Ø60)
                  </th>
                  <th colSpan={10} className="sticky top-0 z-30 px-3 py-2 text-center border-r-2 border-b border-slate-300 dark:border-slate-700 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                    DIAMETER 80 CM (Ø80)
                  </th>
                  <th colSpan={10} className="sticky top-0 z-30 px-3 py-2 text-center border-b border-slate-200 dark:border-slate-700 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-bold">
                    DIAMETER 100 CM (Ø100)
                  </th>
                </tr>

                {/* Baris Header Bawah: 4x 10 Kolom Sub-Diameter */}
                <tr className="h-[34px] text-[10.5px]">
                  {[40, 60, 80, 100].map((dia) => (
                    <React.Fragment key={dia}>
                      <th
                        onClick={() => handleSort(`d${dia}_order`)}
                        className="sticky top-[34px] z-20 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 px-2 py-2 text-center font-bold cursor-pointer select-none"
                      >
                        <div className="inline-flex items-center justify-center gap-0.5">
                          <span>Order</span>
                          {renderSortArrows(`d${dia}_order`)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort(`d${dia}_drop`)}
                        className="sticky top-[34px] z-20 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 px-2 py-2 text-center font-bold cursor-pointer select-none"
                      >
                        <div className="inline-flex items-center justify-center gap-0.5">
                          <span>Drop</span>
                          {renderSortArrows(`d${dia}_drop`)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort(`d${dia}_tglDrop`)}
                        className="sticky top-[34px] z-20 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 px-2.5 py-2 text-center font-bold cursor-pointer select-none"
                      >
                        <div className="inline-flex items-center justify-center gap-0.5">
                          <span>Tgl Drop</span>
                          {renderSortArrows(`d${dia}_tglDrop`)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort(`d${dia}_sisa`)}
                        className="sticky top-[34px] z-20 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 px-2 py-2 text-center font-bold text-rose-600 dark:text-rose-400 cursor-pointer select-none"
                      >
                        <div className="inline-flex items-center justify-center gap-0.5">
                          <span>Sisa</span>
                          {renderSortArrows(`d${dia}_sisa`)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort(`d${dia}_pctDtg`)}
                        className="sticky top-[34px] z-20 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 px-2 py-2 text-center font-bold cursor-pointer select-none"
                      >
                        <div className="inline-flex items-center justify-center gap-0.5">
                          <span>% Dtg</span>
                          {renderSortArrows(`d${dia}_pctDtg`)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort(`d${dia}_pasangManual`)}
                        className="sticky top-[34px] z-20 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 px-2 py-2 text-center font-bold cursor-pointer select-none"
                      >
                        <div className="inline-flex items-center justify-center gap-0.5">
                          <span>P. Man</span>
                          {renderSortArrows(`d${dia}_pasangManual`)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort(`d${dia}_pasangSap`)}
                        className="sticky top-[34px] z-20 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 px-2 py-2 text-center font-bold cursor-pointer select-none"
                      >
                        <div className="inline-flex items-center justify-center gap-0.5">
                          <span>P. SAP</span>
                          {renderSortArrows(`d${dia}_pasangSap`)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort(`d${dia}_saldo`)}
                        className="sticky top-[34px] z-20 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 px-2.5 py-2 text-center font-bold text-amber-600 dark:text-amber-400 cursor-pointer select-none"
                      >
                        <div className="inline-flex items-center justify-center gap-0.5">
                          <span>Saldo</span>
                          {renderSortArrows(`d${dia}_saldo`)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort(`d${dia}_pctPasang`)}
                        className="sticky top-[34px] z-20 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 px-2 py-2 text-center font-bold cursor-pointer select-none"
                      >
                        <div className="inline-flex items-center justify-center gap-0.5">
                          <span>% Psg</span>
                          {renderSortArrows(`d${dia}_pctPasang`)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort(`d${dia}_status`)}
                        className={`sticky top-[34px] z-20 bg-slate-100 dark:bg-slate-800 border-b ${
                          dia !== 100 ? 'border-r-2 border-slate-300 dark:border-slate-700' : 'border-r border-slate-200 dark:border-slate-700'
                        } px-2.5 py-2 text-center font-bold cursor-pointer select-none`}
                      >
                        <div className="inline-flex items-center justify-center gap-0.5">
                          <span>Status</span>
                          {renderSortArrows(`d${dia}_status`)}
                        </div>
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-800 dark:text-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={53} className="px-4 py-12 text-center text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00873D]" />
                      <span>Memuat data monitoring gorong-gorong...</span>
                    </td>
                  </tr>
                ) : filteredOrderList.length === 0 ? (
                  <tr>
                    <td colSpan={53} className="px-4 py-12 text-center text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      Tidak ada data lokasi order yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredOrderList.map((item: any, idx: number) => (
                    <tr
                      key={item.lokasi}
                      className={`hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors group ${
                        idx % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-900'
                      }`}
                    >
                      {/* 11 Kolom Ter-Freeze dari No sampai Prioritas (100% Solid Non-Tembus) */}
                      <td className={`sticky left-0 z-20 w-[45px] min-w-[45px] max-w-[45px] text-center font-mono text-[11px] text-slate-500 border-r border-b border-slate-200 dark:border-slate-800 px-1 py-2 ${
                        idx % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-900'
                      } group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors`}>
                        {idx + 1}
                      </td>
                      <td className={`sticky left-[45px] z-20 w-[85px] min-w-[85px] max-w-[85px] text-center font-bold border-r border-b border-slate-200 dark:border-slate-800 px-1 py-1.5 ${
                        idx % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-900'
                      } group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors`}>
                        <button
                          type="button"
                          onClick={() => setSelectedDetailLokasi(item.lokasi)}
                          className="inline-flex items-center justify-center gap-1 w-full py-1 px-1 rounded-md text-[#00873D] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 font-bold transition-all cursor-pointer group/btn"
                          title={`Klik untuk melihat detail master data status lokasi ${item.lokasi}`}
                        >
                          <MapPin className="w-3 h-3 shrink-0 text-[#00873D] group-hover/btn:scale-110 transition-transform" />
                          <span className="underline decoration-dotted underline-offset-2 hover:decoration-solid">{item.lokasi}</span>
                        </button>
                      </td>
                      <td className={`sticky left-[130px] z-20 w-[55px] min-w-[55px] max-w-[55px] text-center border-r border-b border-slate-200 dark:border-slate-800 px-1 py-2 ${
                        idx % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-900'
                      } group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors`}>
                        {item.wilayah}
                      </td>
                      <td className={`sticky left-[185px] z-20 w-[60px] min-w-[60px] max-w-[60px] text-center font-mono border-r border-b border-slate-200 dark:border-slate-800 px-1 py-2 ${
                        idx % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-900'
                      } group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors`}>
                        {item.luas !== null && item.luas !== undefined ? Number(item.luas).toString() : '-'}
                      </td>
                      <td className={`sticky left-[245px] z-20 w-[75px] min-w-[75px] max-w-[75px] text-center font-semibold border-r border-b border-slate-200 dark:border-slate-800 px-1 py-2 ${
                        idx % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-900'
                      } group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors`}>
                        {item.status}
                      </td>
                      <td className={`sticky left-[320px] z-20 w-[65px] min-w-[65px] max-w-[65px] text-center font-mono border-r border-b border-slate-200 dark:border-slate-800 px-1 py-2 ${
                        idx % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-900'
                      } group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors`}>
                        {item.umurBulan}
                      </td>
                      <td className={`sticky left-[385px] z-20 w-[85px] min-w-[85px] max-w-[85px] text-center font-mono text-[10px] text-slate-500 border-r border-b border-slate-200 dark:border-slate-800 px-1 py-2 ${
                        idx % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-900'
                      } group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors`}>
                        {item.tanggalOrder}
                      </td>
                      <td className={`sticky left-[470px] z-20 w-[155px] min-w-[155px] max-w-[155px] text-center text-slate-700 dark:text-slate-300 font-medium border-r border-b border-slate-200 dark:border-slate-800 px-1.5 py-2 ${
                        idx % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-900'
                      } group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors`} title={item.aktBk}>
                        {item.aktBk}
                      </td>
                      <td className={`sticky left-[625px] z-20 w-[70px] min-w-[70px] max-w-[70px] text-center text-[10px] border-r border-b border-slate-200 dark:border-slate-800 px-1 py-2 ${
                        idx % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-900'
                      } group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors`}>
                        {item.dsmBk}
                      </td>
                      <td className={`sticky left-[695px] z-20 w-[70px] min-w-[70px] max-w-[70px] text-center text-[10px] border-r border-b border-slate-200 dark:border-slate-800 px-1 py-2 ${
                        idx % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-900'
                      } group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors`}>
                        {item.dsmSt}
                      </td>
                      <td className={`sticky left-[765px] z-20 w-[70px] min-w-[70px] max-w-[70px] text-center border-r-2 border-b border-slate-300 dark:border-slate-700 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.12)] px-1 py-2 ${
                        idx % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-900'
                      } group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors`}>
                        {renderPriorityBadge(item.prioritas)}
                      </td>

                      {/* Kolom Bebas Geser ke Samping */}
                      <td className="px-2.5 py-2 text-center border-r border-b border-slate-200 dark:border-slate-800 w-[75px] min-w-[75px]">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.statusAll === 'Close'
                            ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                        }`}>
                          {item.statusAll}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 text-center font-mono border-r-2 border-b border-slate-300 dark:border-slate-700 w-[70px] min-w-[70px]">{Math.round(Number(item.ratioPerHa) || 0)}</td>

                      {/* Rincian 4 Diameter (Ø40, Ø60, Ø80, Ø100) */}
                      {['d40', 'd60', 'd80', 'd100'].map((diaKey, dIdx) => {
                        const d = item[diaKey];
                        return (
                          <React.Fragment key={diaKey}>
                            <td className="px-2 py-2 text-center font-mono font-bold border-r border-b border-slate-200 dark:border-slate-800">{d?.order || 0}</td>
                            <td className="px-2 py-2 text-center font-mono text-emerald-600 dark:text-emerald-400 font-semibold border-r border-b border-slate-200 dark:border-slate-800">{d?.drop || 0}</td>
                            <td className="px-2.5 py-2 text-center font-mono text-[10px] text-slate-400 border-r border-b border-slate-200 dark:border-slate-800">{d?.tglTerakhirDrop}</td>
                            <td className="px-2 py-2 text-center font-mono text-rose-500 font-semibold border-r border-b border-slate-200 dark:border-slate-800">{d?.sisaKebutuhan || 0}</td>
                            <td className="px-2 py-2 text-center font-mono text-[10.5px] border-r border-b border-slate-200 dark:border-slate-800">{d?.pctKedatangan}%</td>
                            <td className="px-2 py-2 text-center font-mono border-r border-b border-slate-200 dark:border-slate-800">{d?.pasangManual || 0}</td>
                            <td className="px-2 py-2 text-center font-mono text-blue-600 dark:text-blue-400 font-semibold border-r border-b border-slate-200 dark:border-slate-800">{d?.pasangSap || 0}</td>
                            <td className="px-2.5 py-2 text-center font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/5 border-r border-b border-slate-200 dark:border-slate-800">{d?.saldo || 0}</td>
                            <td className="px-2 py-2 text-center font-mono text-[10.5px] border-r border-b border-slate-200 dark:border-slate-800">{d?.pctPasang}%</td>
                            <td className={`px-2.5 py-2 text-center border-b ${dIdx !== 3 ? 'border-r-2 border-slate-300 dark:border-slate-700' : 'border-r border-slate-200 dark:border-slate-800'}`}>
                              <span className={`text-[10px] font-bold ${d?.status === 'Close' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                {d?.status}
                              </span>
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TABEL 2: LIST LOKASI BELUM ORDER */
        <div className="space-y-4">
          {/* 4 Summary Cards di atas Tabel Belum Order (Wilayah, Lokasi, Luas Ha, Status) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Wilayah */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Wilayah
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {belumOrderSummary.totalWilayah} <span className="text-xs font-semibold text-slate-400">Wilayah</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">AW01 s/d AW07</p>
              </div>
            </div>

            {/* Card 2: Lokasi */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                  Lokasi
                </span>
                <div className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <MapPin className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {belumOrderSummary.totalLokasi} <span className="text-xs font-semibold text-slate-400">Lokasi</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Petak aktif belum order</p>
              </div>
            </div>

            {/* Card 3: Luas (Ha) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  Luas (Ha)
                </span>
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {belumOrderSummary.totalLuas} <span className="text-xs font-semibold text-slate-400">Ha</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Total akumulasi luas netto</p>
              </div>
            </div>

            {/* Card 4: Status */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                  Status
                </span>
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xl font-black text-slate-900 dark:text-slate-100">
                  BK & ST
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Setelah Dolomit s/d Selesai Tanam</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-amber-500/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Daftar Lokasi Lahan Aktif yang Belum Memiliki Permintaan Order Gorong-Gorong
                </span>
              </div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                Total: {filteredBelumOrderList.length} Lokasi
              </span>
            </div>

          <div className="overflow-x-auto max-h-[580px] scrollbar-thin border border-slate-200 dark:border-slate-800">
            <table className="w-full text-center border-separate border-spacing-0 text-xs whitespace-nowrap">
              <thead className="text-slate-700 dark:text-slate-200 font-bold">
                <tr className="h-[34px]">
                  <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 px-4 py-2.5 text-center font-bold">No</th>
                  <th
                    onClick={() => handleBelumSort('wilayah')}
                    className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 px-4 py-2.5 text-center font-bold cursor-pointer select-none"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Wilayah</span>
                      {renderBelumSortArrows('wilayah')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleBelumSort('lokasi')}
                    className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 px-4 py-2.5 text-center font-bold cursor-pointer select-none"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Lokasi</span>
                      {renderBelumSortArrows('lokasi')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleBelumSort('luasNetto')}
                    className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 px-4 py-2.5 text-center font-bold cursor-pointer select-none"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Luas Netto (Ha)</span>
                      {renderBelumSortArrows('luasNetto')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleBelumSort('status')}
                    className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 px-4 py-2.5 text-center font-bold cursor-pointer select-none"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Status Tanaman</span>
                      {renderBelumSortArrows('status')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleBelumSort('aktBk')}
                    className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-2.5 text-center font-bold cursor-pointer select-none"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Aktivitas Terakhir (Akt. BK)</span>
                      {renderBelumSortArrows('aktBk')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-800 dark:text-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#F58220]" />
                      <span>Memuat data petak belum order...</span>
                    </td>
                  </tr>
                ) : filteredBelumOrderList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      Seluruh petak lahan aktif sudah memiliki transaksi order.
                    </td>
                  </tr>
                ) : (
                  filteredBelumOrderList.map((item: any, idx: number) => (
                    <tr
                      key={item.lokasi}
                      className={`hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors ${
                        idx % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-900'
                      }`}
                    >
                      <td className="px-4 py-2 font-mono text-slate-400 text-center border-r border-b border-slate-200 dark:border-slate-800">{idx + 1}</td>
                      <td className="px-4 py-2 font-bold text-center border-r border-b border-slate-200 dark:border-slate-800">{item.wilayah}</td>
                      <td className="px-3 py-1.5 font-bold text-center border-r border-b border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailLokasi(item.lokasi)}
                          className="inline-flex items-center justify-center gap-1 py-1 px-2 rounded-md text-[#00873D] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 font-bold transition-all cursor-pointer group/btn"
                          title={`Klik untuk melihat detail master data status lokasi ${item.lokasi}`}
                        >
                          <MapPin className="w-3 h-3 shrink-0 text-[#00873D] group-hover/btn:scale-110 transition-transform" />
                          <span className="underline decoration-dotted underline-offset-2 hover:decoration-solid">{item.lokasi}</span>
                        </button>
                      </td>
                      <td className="px-4 py-2 text-center font-mono border-r border-b border-slate-200 dark:border-slate-800">{item.luasNetto !== null && item.luasNetto !== undefined ? Number(item.luasNetto).toString() : '-'}</td>
                      <td className="px-4 py-2 font-medium text-center border-r border-b border-slate-200 dark:border-slate-800">{item.status}</td>
                      <td className="px-6 py-2 font-semibold text-amber-700 dark:text-amber-400 text-center border-b border-slate-200 dark:border-slate-800">
                        {item.aktBk}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {/* Modal / Drawer Detail Master Data Status Lokasi */}
    <MasterLokasiDetailDrawer
      isOpen={!!selectedDetailLokasi}
      onClose={() => setSelectedDetailLokasi(null)}
      lokasi={selectedDetailLokasi}
      orderData={selectedOrderRow}
    />

    {/* ============================================================== */}
    {/* MODAL UPLOAD EXCEL MONITORING GORONG-GORONG                    */}
    {/* ============================================================== */}
    {isUploadModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/20">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Upload Excel Monitoring Gorong-Gorong
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sinkronisasi & pembaruan data rekapitulasi order, drop, pasang, serta status lokasi.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Mode Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                Pilih Metode Sinkronisasi:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mode: Smart Merge */}
                <button
                  type="button"
                  onClick={() => setUploadMode('merge')}
                  className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer flex items-start gap-3 ${
                    uploadMode === 'merge'
                      ? 'border-violet-600 bg-violet-50/70 dark:bg-violet-950/40 text-violet-950 dark:text-violet-100 ring-1 ring-violet-500'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-850'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                      uploadMode === 'merge' ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-400'
                    }`}
                  >
                    {uploadMode === 'merge' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold">Update Parsial (Smart Merge)</p>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-violet-200 dark:bg-violet-900 text-violet-800 dark:text-violet-200">
                        Disarankan
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Hanya mereplace baris/lokasi yang terdapat di dalam file Excel (misal baris 5–10). Lokasi 1–5 dan lainnya tetap aman tidak terhapus.
                    </p>
                  </div>
                </button>

                {/* Mode: Full Replace */}
                <button
                  type="button"
                  onClick={() => setUploadMode('full_replace')}
                  className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer flex items-start gap-3 ${
                    uploadMode === 'full_replace'
                      ? 'border-rose-600 bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-1 ring-rose-500'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-850'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                      uploadMode === 'full_replace' ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-400'
                    }`}
                  >
                    {uploadMode === 'full_replace' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
                      Replace Seluruh Data (Wipe & Replace)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Menghapus seluruh transaksi lama di database dan menggantinya 100% dari file Excel yang diunggah.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Drag & Drop Card */}
            <div
              onDragEnter={handleDragUpload}
              onDragLeave={handleDragUpload}
              onDragOver={handleDragUpload}
              onDrop={handleDropUpload}
              onClick={() => fileUploadInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-violet-500 bg-violet-500/10 scale-[1.005]'
                  : 'border-violet-300 dark:border-violet-800/60 hover:border-violet-500 hover:bg-violet-500/5 bg-slate-50/60 dark:bg-slate-900/50'
              }`}
            >
              <input
                ref={fileUploadInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleUploadExcel(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-2.5">
                <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  {isUploading ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <UploadCloud className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {isUploading
                      ? 'Sedang memproses & menyinkronkan data Excel...'
                      : 'Klik atau seret file Excel Monitor Gorong-Gorong ke sini'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Mendukung berkas .xlsx dengan multi-sheet otomatis (Lokasi Order, Data Order, Data Drop, Status Lokasi)
                  </p>
                </div>
              </div>
            </div>

            {/* Info Panduan Multi-Sheet */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <FileSpreadsheet className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span>Format Sheet yang Didukung Otomatis:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                <li>
                  <strong>Sheet `Lokasi Order`:</strong> Rekapitulasi per baris lokasi (Order, Drop, Pasang Manual Ø40/60/80/100, Luas, Umur).
                </li>
                <li>
                  <strong>Sheet Transaksi:</strong> `Data Order`, `Data Drop`, `Data Pasang Man.` (transaksi harian).
                </li>
                <li>
                  <strong>Sheet Master:</strong> `Status Lokasi` (sinkronisasi luas netto, status tanaman, umur bulan).
                </li>
                <li>
                  Sheet lain yang tidak terkait (Sum2, Summary, Bantu, dll.) akan diabaikan secara aman.
                </li>
              </ul>
            </div>

            {/* Error Alert */}
            {uploadError && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-2.5 text-xs animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Gagal Mengunggah Berkas</p>
                  <p className="mt-0.5">{uploadError}</p>
                </div>
              </div>
            )}

            {/* Upload Success Card */}
            {uploadResult && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <p className="font-bold text-sm">Sinkronisasi Excel Berhasil!</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/70 dark:bg-emerald-800/80 text-emerald-900 dark:text-emerald-100">
                    {uploadResult.mode === 'full_replace' ? 'Replace Seluruh Data' : 'Update Parsial (Smart Merge)'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Data telah diperbarui secara instan. Seluruh kartu KPI, grafik, dan tabel telah menyesuaikan hasil sinkronisasi.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/50">
                    <p className="text-slate-500 dark:text-slate-400">Lokasi Terupdate</p>
                    <p className="font-bold text-emerald-800 dark:text-emerald-200 text-sm">
                      {uploadResult.totalLocations} lokasi
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/50">
                    <p className="text-slate-500 dark:text-slate-400">Total Transaksi</p>
                    <p className="font-bold text-emerald-800 dark:text-emerald-200 text-sm">
                      {uploadResult.totalTransactions} baris
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/50">
                    <p className="text-slate-500 dark:text-slate-400">Total Gorong2</p>
                    <p className="font-bold text-emerald-800 dark:text-emerald-200 text-sm">
                      {uploadResult.totalPcs.toLocaleString()} pcs
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/50">
                    <p className="text-slate-500 dark:text-slate-400">Status Lokasi</p>
                    <p className="font-bold text-emerald-800 dark:text-emerald-200 text-sm">
                      {uploadResult.statusLokasiUpsertedCount} lokasi
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
}
