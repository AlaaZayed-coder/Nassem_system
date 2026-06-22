/**
 * Permissions system
 *
 * Each feature has a level:
 *   items      : 'none' | 'view' | 'edit'
 *   approve    : 'no'   | 'yes'
 *   categories : 'none' | 'view' | 'edit'
 *   audit      : 'none' | 'view'
 *   reports    : 'none' | 'view'
 *   export     : 'no'   | 'yes'
 *   users      : 'no'   | 'yes'
 *   settings   : 'no'   | 'yes'
 */

export const FEATURES = [
  { key: 'items',      label: 'الأصناف والتسعير',          levels: ['none','view','edit'] },
  { key: 'approve',    label: 'اعتماد الأسعار وتثبيتها',   levels: ['no','yes'] },
  { key: 'categories', label: 'التصنيفات',                  levels: ['none','view','edit'] },
  { key: 'audit',      label: 'سجل التعديلات',              levels: ['none','view'] },
  { key: 'reports',    label: 'التقارير',                   levels: ['none','view'] },
  { key: 'export',     label: 'التصدير (Excel / CSV)',       levels: ['no','yes'] },
  { key: 'users',      label: 'إدارة المستخدمين',           levels: ['no','yes'] },
  { key: 'settings',   label: 'الإعدادات والنسخ الاحتياطي', levels: ['no','yes'] },
];

export const LEVEL_LABEL = {
  none: 'لا صلاحية',
  view: 'مشاهدة',
  edit: 'تعديل',
  no:   'لا صلاحية',
  yes:  'صلاحية كاملة',
};

/* Default permissions per role */
export const ROLE_DEFAULTS = {
  admin: {
    items: 'edit', approve: 'yes', categories: 'edit',
    audit: 'view', reports: 'view', export: 'yes',
    users: 'yes',  settings: 'yes',
  },
  pricing_manager: {
    items: 'edit', approve: 'yes', categories: 'view',
    audit: 'view', reports: 'view', export: 'yes',
    users: 'no',   settings: 'no',
  },
};

export function defaultPermissions(role) {
  return ROLE_DEFAULTS[role] || ROLE_DEFAULTS.pricing_manager;
}

export function parsePermissions(raw, role) {
  if (!raw) return defaultPermissions(role);
  try { return { ...defaultPermissions(role), ...JSON.parse(raw) }; }
  catch { return defaultPermissions(role); }
}

/* Check helpers */
export function can(perms, feature, level) {
  const val = perms?.[feature];
  if (!val || val === 'none' || val === 'no') return false;
  if (level === 'view') return val === 'view' || val === 'edit' || val === 'yes';
  if (level === 'edit') return val === 'edit' || val === 'yes';
  return val !== 'none' && val !== 'no';
}
