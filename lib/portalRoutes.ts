/**
 * Pemetaan Rute URL Berslash untuk Portal Monitor Gorong-Gorong dan Portal Labita
 */

// ==================== 1. PORTAL GORONG-GORONG ====================

export const GORONG_GORONG_ROUTES = {
  // Menu 1: Monitor
  monitor: '/gorong-gorong/monitor-gorong-gorong',

  // Menu 2: Form Input
  formInput: '/gorong-gorong/form-input/order-gorong-gorong',
  order: '/gorong-gorong/form-input/order-gorong-gorong',

  // Menu 3: Master Data
  masterStatusLokasi: '/gorong-gorong/master-data/master-status-lokasi',
  masterWaterlogging: '/gorong-gorong/master-data/master-waterlogging',
  masterSap: '/gorong-gorong/master-data/master-upload-data-realisasi-sap',
  masterOrder: '/gorong-gorong/master-data/master-data-order',
  masterDrop: '/gorong-gorong/master-data/master-data-drop',

  // Menu 4: Manajemen User
  userManagement: '/gorong-gorong/manajemen-user',
} as const;

export function getGorongGorongRoute(activeTab: string, subTab?: string): string {
  switch (activeTab) {
    case 'monitor_gorong_gorong':
      return GORONG_GORONG_ROUTES.monitor;
    case 'form_input':
    case 'order_wilayah':
      return GORONG_GORONG_ROUTES.formInput;
    case 'master_data':
      if (subTab === 'master_order') return GORONG_GORONG_ROUTES.masterOrder;
      if (subTab === 'master_drop') return GORONG_GORONG_ROUTES.masterDrop;
      if (subTab === 'master_waterlogging') return GORONG_GORONG_ROUTES.masterWaterlogging;
      if (subTab === 'master_sap') return GORONG_GORONG_ROUTES.masterSap;
      return GORONG_GORONG_ROUTES.masterStatusLokasi;
    case 'user_management':
      return GORONG_GORONG_ROUTES.userManagement;
    default:
      return GORONG_GORONG_ROUTES.monitor;
  }
}

export function parseGorongGorongPathname(pathname: string) {
  const clean = pathname.replace(/\/+$/, '');

  // Default redirect jika buka /gorong-gorong
  if (clean === '/gorong-gorong') {
    return {
      activeTab: 'monitor_gorong_gorong',
      orderWilayahSubTab: 'order_gorong_gorong',
      masterDataSubTab: 'master_status_lokasi',
      redirectTo: GORONG_GORONG_ROUTES.monitor,
    };
  }

  // 1. Monitor
  if (clean === '/gorong-gorong/monitor-gorong-gorong') {
    return {
      activeTab: 'monitor_gorong_gorong',
      orderWilayahSubTab: 'order_gorong_gorong',
      masterDataSubTab: 'master_status_lokasi',
      redirectTo: null,
    };
  }

  // 2. Form Input
  if (clean === '/gorong-gorong/form-input') {
    return {
      activeTab: 'form_input',
      orderWilayahSubTab: 'order_gorong_gorong',
      masterDataSubTab: 'master_status_lokasi',
      redirectTo: GORONG_GORONG_ROUTES.formInput,
    };
  }
  if (clean === '/gorong-gorong/form-input/order-gorong-gorong') {
    return {
      activeTab: 'form_input',
      orderWilayahSubTab: 'order_gorong_gorong',
      masterDataSubTab: 'master_status_lokasi',
      redirectTo: null,
    };
  }

  // 3. Master Data
  if (clean === '/gorong-gorong/master-data') {
    return {
      activeTab: 'master_data',
      orderWilayahSubTab: 'order_gorong_gorong',
      masterDataSubTab: 'master_status_lokasi',
      redirectTo: GORONG_GORONG_ROUTES.masterStatusLokasi,
    };
  }
  if (clean === '/gorong-gorong/master-data/master-status-lokasi') {
    return {
      activeTab: 'master_data',
      orderWilayahSubTab: 'order_gorong_gorong',
      masterDataSubTab: 'master_status_lokasi',
      redirectTo: null,
    };
  }
  if (clean === '/gorong-gorong/master-data/master-waterlogging') {
    return {
      activeTab: 'master_data',
      orderWilayahSubTab: 'order_gorong_gorong',
      masterDataSubTab: 'master_waterlogging',
      redirectTo: null,
    };
  }
  if (clean === '/gorong-gorong/master-data/master-upload-data-realisasi-sap') {
    return {
      activeTab: 'master_data',
      orderWilayahSubTab: 'order_gorong_gorong',
      masterDataSubTab: 'master_sap',
      redirectTo: null,
    };
  }
  if (clean === '/gorong-gorong/master-data/master-data-order') {
    return {
      activeTab: 'master_data',
      orderWilayahSubTab: 'order_gorong_gorong',
      masterDataSubTab: 'master_order',
      redirectTo: null,
    };
  }
  if (clean === '/gorong-gorong/master-data/master-data-drop') {
    return {
      activeTab: 'master_data',
      orderWilayahSubTab: 'order_gorong_gorong',
      masterDataSubTab: 'master_drop',
      redirectTo: null,
    };
  }

  // 4. Manajemen User
  if (clean === '/gorong-gorong/manajemen-user') {
    return {
      activeTab: 'user_management',
      orderWilayahSubTab: 'order_gorong_gorong',
      masterDataSubTab: 'master_status_lokasi',
      redirectTo: null,
    };
  }

  // Fallback default
  return {
    activeTab: 'monitor_gorong_gorong',
    orderWilayahSubTab: 'order_gorong_gorong',
    masterDataSubTab: 'master_status_lokasi',
    redirectTo: GORONG_GORONG_ROUTES.monitor,
  };
}

// ==================== 2. PORTAL LABITA ====================

export const LABITA_ROUTES = {
  // Menu 1: Executive Summary
  executivePengolahan: '/labita/executive-summary/pengolahan-lahan',
  executiveTanam: '/labita/executive-summary/tanam',

  // Menu 2: Pengolahan Lahan
  pengolahanStokLahan: '/labita/pengolahan-lahan/list-stok-lahan',
  pengolahanDataLahan: '/labita/pengolahan-lahan/data-lahan',

  // Menu 3: Planting
  plantingRealTanam: '/labita/planting/real-tanam-nanas',
  plantingInputPetik: '/labita/planting/input-real-tanam-dan-petik-nanas',
  plantingProsesSelesai: '/labita/planting/proses-tanam-dan-selesai-tanam',
  plantingUpdate: '/labita/planting/update',

  // Menu 4: Manajemen User
  userManagement: '/labita/manajemen-user',
} as const;

export function getLabitaRoute(activeTab: string, subTab?: string): string {
  switch (activeTab) {
    case 'executive_summary':
      if (subTab === 'tanam') return LABITA_ROUTES.executiveTanam;
      return LABITA_ROUTES.executivePengolahan;
    case 'pengolahan_lahan_bibit_tanam':
      if (subTab === 'data_lahan') return LABITA_ROUTES.pengolahanDataLahan;
      return LABITA_ROUTES.pengolahanStokLahan;
    case 'planting':
      if (subTab === 'input_real_tanam_petik') return LABITA_ROUTES.plantingInputPetik;
      if (subTab === 'proses_selesai_tanam') return LABITA_ROUTES.plantingProsesSelesai;
      if (subTab === 'update') return LABITA_ROUTES.plantingUpdate;
      return LABITA_ROUTES.plantingRealTanam;
    case 'user_management':
      return LABITA_ROUTES.userManagement;
    default:
      return LABITA_ROUTES.executivePengolahan;
  }
}

export function parseLabitaPathname(pathname: string) {
  const clean = pathname.replace(/\/+$/, '');

  // Default redirect jika buka /labita
  if (clean === '/labita') {
    return {
      activeTab: 'executive_summary',
      executiveSubTab: 'pengolahan_lahan',
      pengolahanSubTab: 'list_stok_lahan',
      plantingSubTab: 'real_tanam_nanas',
      redirectTo: LABITA_ROUTES.executivePengolahan,
    };
  }

  // 1. Executive Summary
  if (clean === '/labita/executive-summary') {
    return {
      activeTab: 'executive_summary',
      executiveSubTab: 'pengolahan_lahan',
      pengolahanSubTab: 'list_stok_lahan',
      plantingSubTab: 'real_tanam_nanas',
      redirectTo: LABITA_ROUTES.executivePengolahan,
    };
  }
  if (clean === '/labita/executive-summary/pengolahan-lahan') {
    return {
      activeTab: 'executive_summary',
      executiveSubTab: 'pengolahan_lahan',
      pengolahanSubTab: 'list_stok_lahan',
      plantingSubTab: 'real_tanam_nanas',
      redirectTo: null,
    };
  }
  if (clean === '/labita/executive-summary/tanam') {
    return {
      activeTab: 'executive_summary',
      executiveSubTab: 'tanam',
      pengolahanSubTab: 'list_stok_lahan',
      plantingSubTab: 'real_tanam_nanas',
      redirectTo: null,
    };
  }

  // 2. Pengolahan Lahan
  if (clean === '/labita/pengolahan-lahan') {
    return {
      activeTab: 'pengolahan_lahan_bibit_tanam',
      executiveSubTab: 'pengolahan_lahan',
      pengolahanSubTab: 'list_stok_lahan',
      plantingSubTab: 'real_tanam_nanas',
      redirectTo: LABITA_ROUTES.pengolahanStokLahan,
    };
  }
  if (clean === '/labita/pengolahan-lahan/list-stok-lahan') {
    return {
      activeTab: 'pengolahan_lahan_bibit_tanam',
      executiveSubTab: 'pengolahan_lahan',
      pengolahanSubTab: 'list_stok_lahan',
      plantingSubTab: 'real_tanam_nanas',
      redirectTo: null,
    };
  }
  if (clean === '/labita/pengolahan-lahan/data-lahan') {
    return {
      activeTab: 'pengolahan_lahan_bibit_tanam',
      executiveSubTab: 'pengolahan_lahan',
      pengolahanSubTab: 'data_lahan',
      plantingSubTab: 'real_tanam_nanas',
      redirectTo: null,
    };
  }

  // 3. Planting
  if (clean === '/labita/planting') {
    return {
      activeTab: 'planting',
      executiveSubTab: 'pengolahan_lahan',
      pengolahanSubTab: 'list_stok_lahan',
      plantingSubTab: 'real_tanam_nanas',
      redirectTo: LABITA_ROUTES.plantingRealTanam,
    };
  }
  if (clean === '/labita/planting/real-tanam-nanas') {
    return {
      activeTab: 'planting',
      executiveSubTab: 'pengolahan_lahan',
      pengolahanSubTab: 'list_stok_lahan',
      plantingSubTab: 'real_tanam_nanas',
      redirectTo: null,
    };
  }
  if (clean === '/labita/planting/input-real-tanam-dan-petik-nanas') {
    return {
      activeTab: 'planting',
      executiveSubTab: 'pengolahan_lahan',
      pengolahanSubTab: 'list_stok_lahan',
      plantingSubTab: 'input_real_tanam_petik',
      redirectTo: null,
    };
  }
  if (clean === '/labita/planting/proses-tanam-dan-selesai-tanam') {
    return {
      activeTab: 'planting',
      executiveSubTab: 'pengolahan_lahan',
      pengolahanSubTab: 'list_stok_lahan',
      plantingSubTab: 'proses_selesai_tanam',
      redirectTo: null,
    };
  }
  if (clean === '/labita/planting/update') {
    return {
      activeTab: 'planting',
      executiveSubTab: 'pengolahan_lahan',
      pengolahanSubTab: 'list_stok_lahan',
      plantingSubTab: 'update',
      redirectTo: null,
    };
  }

  // 4. Manajemen User
  if (clean === '/labita/manajemen-user' || clean === '/labita/planting/manajemen-user') {
    return {
      activeTab: 'user_management',
      executiveSubTab: 'pengolahan_lahan',
      pengolahanSubTab: 'list_stok_lahan',
      plantingSubTab: 'real_tanam_nanas',
      redirectTo: clean !== '/labita/manajemen-user' ? LABITA_ROUTES.userManagement : null,
    };
  }

  // Fallback default
  return {
    activeTab: 'executive_summary',
    executiveSubTab: 'pengolahan_lahan',
    pengolahanSubTab: 'list_stok_lahan',
    plantingSubTab: 'real_tanam_nanas',
    redirectTo: LABITA_ROUTES.executivePengolahan,
  };
}
