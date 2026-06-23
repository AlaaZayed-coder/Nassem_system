export const STATUS_MAP: Record<string, [string, string]> = {
  'معتمد':        ['#EAF3DE', '#27500A'],
  'قيد العمل':    ['#E6F1FB', '#0C447C'],
  'بحاجة مراجعة': ['#FAEEDA', '#633806'],
  'غير مسعّر':    ['#F1EFE8', '#444441'],
  'مؤجّل':        ['#EEEDFE', '#3C3489'],
};

export function StatusBadge({ status }: { status: string }) {
  const [bg, color] = STATUS_MAP[status] || ['#F1EFE8', '#444441'];
  return <span className="status" style={{ background: bg, color }}>{status || 'غير مسعّر'}</span>;
}
