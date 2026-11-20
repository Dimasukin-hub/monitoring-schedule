/**
 * Pemetaan Rute URL Berslash untuk Portal Monitor Gorong-Gorong dan Portal Labita
 */

// ==================== 1. PORTAL GORONG-GORONG ====================

export const GORONG_GORONG_ROUTES = {
  // Menu 1: Monitor
  monitor: '/gorong-gorong/monitor-gorong-gorong',

  // Menu 1.5: Control Board
  controlBoard: '/gorong-gorong/control-board',

  // Menu 2: Form Input
  formInput: '/gorong-gorong/form-input/order-gorong-gorong',
  order: '/gorong-gorong/form-input/order-gorong-gorong',

  // Menu 3: Master Data
  masterStatusLokasi: '/gorong-gorong/master-data/master-status-lokasi',
  masterWaterlogging: '/gorong-gorong/master-data/master-waterlogging',
  masterSap: '/gorong-gorong/master-data/master-upload-data-realisasi-sap',
  masterOrder: '/gorong-gorong/master-data/master-data-order',
  masterDrop: '/gorong-gorong/master-data/master-data-drop',
  masterPasangManual: '/gorong-gorong/master-data/master-data-pasang-manual',
  masterPindah: '/gorong-gorong/master-data/master-data-pindah-lokasi',

  // Menu 4: Manajemen User
  userManagement: '/gorong-gorong/manajemen-user',
} as const;

export function getGorongGorongRoute(activeTab: string, subTab?: string): string {
  switch (activeTab) {
    case 'monitor_gorong_gorong':
      return GORONG_GORONG_ROUTES.monitor;
    case 'control_board':
      return GORONG_GORONG_ROUTES.controlBoard;
    case 'form_input':
    case 'order_wilayah':
      return GORONG_GORONG_ROUTES.formInput;
    case 'master_data':
      if (subTab === 'master_order') return GORONG_GORONG_ROUTES.masterOrder;
      if (subTab === 'master_drop') return GORONG_GORONG_ROUTES.masterDrop;
      if (subTab === 'master_pasang_manual') return GORONG_GORONG_ROUTES.masterPasangManual;
      if (subTab === 'master_pindah') return GORONG_GORONG_ROUTES.masterPindah;
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

  // 1.5 Control Board
  if (clean === '/gorong-gorong/control-board') {
    return {
      activeTab: 'control_board',
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
  if (clean === '/gorong-gorong/master-data/master-data-pasang-manual') {
    return {
      activeTab: 'master_data',
      orderWilayahSubTab: 'order_gorong_gorong',
      masterDataSubTab: 'master_pasang_manual',
      redirectTo: null,
    };
  }
  if (clean === '/gorong-gorong/master-data/master-data-pindah-lokasi') {
    return {
      activeTab: 'master_data',
      orderWilayahSubTab: 'order_gorong_gorong',
      masterDataSubTab: 'master_pindah',
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

// ==================== 3. PORTAL SULAM ====================

export const SULAM_ROUTES = {
  // Menu 1: Monitoring Sulam
  monitor: '/sulam/monitor-sulam',

  // Menu 2: Form Order Sulam
  formOrder: '/sulam/form-order-sulam',

  // Menu 3: Master Data
  masterStatusLokasi: '/sulam/master-data/master-status-lokasi',
  masterOrder: '/sulam/master-data/master-data-order-sulam',
  masterDrop: '/sulam/master-data/master-data-drop-bibit',
  masterReal: '/sulam/master-data/master-data-real-sulam',
  masterSpek: '/sulam/master-data/master-data-spek-bibit-sulam',

  // Menu 4: Manajemen User
  userManagement: '/sulam/manajemen-user',
} as const;

export function getSulamRoute(activeTab: string, subTab?: string): string {
  switch (activeTab) {
    case 'monitor_sulam':
      return SULAM_ROUTES.monitor;
    case 'form_order_sulam':
    case 'form_input':
      return SULAM_ROUTES.formOrder;
    case 'master_data':
    case 'master_data_sulam':
      if (subTab === 'master_order') return SULAM_ROUTES.masterOrder;
      if (subTab === 'master_drop') return SULAM_ROUTES.masterDrop;
      if (subTab === 'master_real') return SULAM_ROUTES.masterReal;
      if (subTab === 'master_spek' || subTab === 'master_spek_bibit') return SULAM_ROUTES.masterSpek;
      return SULAM_ROUTES.masterStatusLokasi;
    case 'user_management':
      return SULAM_ROUTES.userManagement;
    default:
      return SULAM_ROUTES.monitor;
  }
}

export function parseSulamPathname(pathname: string) {
  const clean = pathname.replace(/\/+$/, '');

  // Default redirect jika buka /sulam
  if (clean === '/sulam') {
    return {
      activeTab: 'monitor_sulam',
      masterDataSubTab: 'master_status_lokasi',
      redirectTo: SULAM_ROUTES.monitor,
    };
  }

  // 1. Monitor
  if (clean === '/sulam/monitor-sulam') {
    return {
      activeTab: 'monitor_sulam',
      masterDataSubTab: 'master_status_lokasi',
      redirectTo: null,
    };
  }

  // 2. Form Order
  if (clean === '/sulam/form-order-sulam' || clean === '/sulam/form-input') {
    return {
      activeTab: 'form_order_sulam',
      masterDataSubTab: 'master_status_lokasi',
      redirectTo: null,
    };
  }

  // 3. Master Data
  if (clean === '/sulam/master-data') {
    return {
      activeTab: 'master_data',
      masterDataSubTab: 'master_status_lokasi',
      redirectTo: SULAM_ROUTES.masterStatusLokasi,
    };
  }
  if (clean === '/sulam/master-data/master-status-lokasi') {
    return {
      activeTab: 'master_data',
      masterDataSubTab: 'master_status_lokasi',
      redirectTo: null,
    };
  }
  if (clean === '/sulam/master-data/master-data-order-sulam' || clean === '/sulam/master-data/master-data-order') {
    return {
      activeTab: 'master_data',
      masterDataSubTab: 'master_order',
      redirectTo: null,
    };
  }
  if (clean === '/sulam/master-data/master-data-drop-bibit' || clean === '/sulam/master-data/master-data-drop') {
    return {
      activeTab: 'master_data',
      masterDataSubTab: 'master_drop',
      redirectTo: null,
    };
  }
  if (clean === '/sulam/master-data/master-data-real-sulam' || clean === '/sulam/master-data/master-data-real') {
    return {
      activeTab: 'master_data',
      masterDataSubTab: 'master_real',
      redirectTo: null,
    };
  }
  if (clean === '/sulam/master-data/master-data-spek-bibit-sulam' || clean === '/sulam/master-data/master-spek') {
    return {
      activeTab: 'master_data',
      masterDataSubTab: 'master_spek',
      redirectTo: null,
    };
  }

  // 4. Manajemen User
  if (clean === '/sulam/manajemen-user') {
    return {
      activeTab: 'user_management',
      masterDataSubTab: 'master_status_lokasi',
      redirectTo: null,
    };
  }

  return {
    activeTab: 'monitor_sulam',
    masterDataSubTab: 'master_status_lokasi',
    redirectTo: SULAM_ROUTES.monitor,
  };
}

