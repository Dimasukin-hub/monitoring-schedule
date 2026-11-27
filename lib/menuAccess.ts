import { getGorongGorongRoute, getLabitaRoute, getSulamRoute } from './portalRoutes';

export type PortalKey = 'labita' | 'gorong_gorong' | 'sulam';

export type AllowedMenusMap = Partial<Record<PortalKey, string[]>>;

export interface PortalMenuOption {
  id: string;
  label: string;
}

export const PORTAL_MENUS: Record<PortalKey, PortalMenuOption[]> = {
  labita: [
    { id: 'executive_summary', label: 'Executive Summary' },
    { id: 'pengolahan_lahan_bibit_tanam', label: 'Pengolahan Lahan' },
    { id: 'planting', label: 'Planting' },
    { id: 'user_management', label: 'Manajemen User' },
  ],
  gorong_gorong: [
    { id: 'monitor_gorong_gorong', label: 'Monitor Gorong-Gorong' },
    { id: 'control_board', label: 'Control Board' },
    { id: 'form_input', label: 'Form Input' },
    { id: 'master_data', label: 'Master Data' },
    { id: 'user_management', label: 'Manajemen User' },
  ],
  sulam: [
    { id: 'monitor_sulam', label: 'Monitoring Sulam' },
    { id: 'form_order_sulam', label: 'Form Order Sulam' },
    { id: 'form_drop_sulam', label: 'Form Drop Sulam' },
    { id: 'form_realisasi_sulam', label: 'Form Realisasi Sulam' },
    { id: 'master_data', label: 'Master Data' },
    { id: 'user_management', label: 'Manajemen User' },
  ],
};

export function normalizePortalKey(portal?: string | null): PortalKey {
  if (!portal) return 'gorong_gorong';
  const clean = portal.toLowerCase();
  if (clean.includes('labita')) return 'labita';
  if (clean.includes('sulam')) return 'sulam';
  return 'gorong_gorong';
}

export function normalizeMenuId(portal: PortalKey, menuId: string): string {
  if (portal === 'gorong_gorong' && menuId === 'order_wilayah') return 'form_input';
  if (portal === 'sulam' && menuId === 'master_data_sulam') return 'master_data';
  if (portal === 'sulam' && menuId === 'form_input') return 'form_order_sulam';
  return menuId;
}

export function sanitizeAllowedMenus(raw: unknown): AllowedMenusMap | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  const cleaned: AllowedMenusMap = {};
  const portals: PortalKey[] = ['labita', 'gorong_gorong', 'sulam'];

  for (const portal of portals) {
    if (Array.isArray(input[portal])) {
      const validIds = new Set(PORTAL_MENUS[portal].map((m) => m.id));
      const uniqueValid = Array.from(
        new Set(
          (input[portal] as unknown[])
            .filter((item): item is string => typeof item === 'string')
            .map((item) => normalizeMenuId(portal, item))
            .filter((item) => validIds.has(item))
        )
      );
      cleaned[portal] = uniqueValid;
    }
  }

  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

export function getDefaultMenusForRole(role: string | null | undefined, portal: PortalKey): string[] {
  const r = (role || '').toLowerCase();
  if (portal === 'labita') {
    if (r === 'super_admin') {
      return ['executive_summary', 'pengolahan_lahan_bibit_tanam', 'planting', 'user_management'];
    }
    return [];
  }

  if (portal === 'gorong_gorong') {
    if (r === 'super_admin' || r === 'admin') {
      return ['monitor_gorong_gorong', 'control_board', 'form_input', 'master_data', 'user_management'];
    }
    if (['kepala_bagian_fe', 'manajer_fe', 'manajer_fm', 'manajer_osd'].includes(r)) {
      return ['monitor_gorong_gorong', 'control_board', 'form_input', 'master_data'];
    }
    if (r === 'kepala_wilayah') {
      return ['monitor_gorong_gorong', 'form_input', 'master_data'];
    }
    if (['user_fe', 'user_wilayah', 'user', 'user_planting'].includes(r)) {
      return ['form_input'];
    }
    return [];
  }

  // portal === 'sulam'
  if (r === 'super_admin') {
    return [
      'monitor_sulam',
      'form_order_sulam',
      'form_drop_sulam',
      'form_realisasi_sulam',
      'master_data',
      'user_management',
    ];
  }
  if (r === 'user_wilayah' || r === 'user') {
    return ['form_order_sulam', 'form_realisasi_sulam'];
  }
  if (r === 'user_planting') {
    return ['form_order_sulam', 'form_drop_sulam'];
  }
  return [];
}

export function hasCustomMenuOverride(
  user: { allowedMenus?: AllowedMenusMap | null } | null | undefined,
  portal: PortalKey
): boolean {
  return Boolean(user?.allowedMenus && Array.isArray(user.allowedMenus[portal]));
}

export function getEffectiveMenusForPortal(
  user: { role?: string | null; allowedMenus?: AllowedMenusMap | null } | null | undefined,
  portal: PortalKey
): string[] {
  if (!user) return [];
  if (user.allowedMenus && Array.isArray(user.allowedMenus[portal])) {
    const validIds = new Set(PORTAL_MENUS[portal].map((m) => m.id));
    return user.allowedMenus[portal]!.filter((id) => validIds.has(id));
  }
  return getDefaultMenusForRole(user.role, portal);
}

export function hasMenuAccess(
  user: { role?: string | null; allowedMenus?: AllowedMenusMap | null } | null | undefined,
  portal: PortalKey,
  menuId: string
): boolean {
  if (!user) return false;
  const normalized = normalizeMenuId(portal, menuId);
  return getEffectiveMenusForPortal(user, portal).includes(normalized);
}

export function hasPortalAccess(
  user: { role?: string | null; allowedMenus?: AllowedMenusMap | null } | null | undefined,
  portal: PortalKey
): boolean {
  return getEffectiveMenusForPortal(user, portal).length > 0;
}

export function getMenuRouteForPortal(portal: PortalKey, menuId: string): string {
  const norm = normalizeMenuId(portal, menuId);
  if (portal === 'labita') return getLabitaRoute(norm);
  if (portal === 'sulam') return getSulamRoute(norm);
  return getGorongGorongRoute(norm);
}

export function getDefaultPortalRoute(
  user: { role?: string | null; allowedMenus?: AllowedMenusMap | null } | null | undefined,
  portal: PortalKey
): string | null {
  const effective = getEffectiveMenusForPortal(user, portal);
  if (effective.length === 0) return null;

  const ordered = PORTAL_MENUS[portal].map((m) => m.id).filter((id) => effective.includes(id));
  const first = ordered[0] || effective[0];
  return getMenuRouteForPortal(portal, first);
}

export function arraysHaveSameMembers(a: string[], b: string[]): boolean {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size !== setB.size) return false;
  for (const item of setA) {
    if (!setB.has(item)) return false;
  }
  return true;
}

