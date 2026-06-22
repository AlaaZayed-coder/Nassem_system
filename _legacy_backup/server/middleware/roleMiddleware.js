import { can } from '../services/permissionsService.js';

/* Permission-based middleware */
export const canEdit    = (req, res, next) => can(req.user?.permissions, 'items',    'edit')    ? next() : deny(res);
export const canApprove = (req, res, next) => can(req.user?.permissions, 'approve',  'yes')     ? next() : deny(res);
export const canAdmin   = (req, res, next) => can(req.user?.permissions, 'users',    'yes')     ? next() : deny(res);
export const canExport  = (req, res, next) => can(req.user?.permissions, 'export',   'yes')     ? next() : deny(res);
export const canViewItems = (req, res, next) => can(req.user?.permissions, 'items',  'view')    ? next() : deny(res);

function deny(res) {
  res.status(403).json({ error: 'ليس لديك صلاحية لتنفيذ هذا الإجراء' });
}
