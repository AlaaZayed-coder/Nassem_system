export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'ليس لديك صلاحية لتنفيذ هذا الإجراء' });
    }
    next();
  };
}

export const canEdit = requireRole('Admin', 'Pricing Manager', 'Pricing Editor');
export const canAdmin = requireRole('Admin');
export const canApprove = requireRole('Admin', 'Pricing Manager');
export const canExport = requireRole('Admin', 'Pricing Manager');
