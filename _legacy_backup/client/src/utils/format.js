export const statuses = ['غير مسعّر', 'قيد العمل', 'بحاجة مراجعة', 'معتمد', 'مؤجّل'];
export const methods = ['تكلفة + هامش', 'يدوي', 'خدمة', 'حسب المتر المربع', 'حسب المتر الطولي', 'بحاجة مراجعة'];

export function money(cents) {
  if (cents === null || cents === undefined || cents === '') return '';
  return `${(Number(cents) / 100).toLocaleString('he-IL', { maximumFractionDigits: 2 })} شيكل`;
}

export function valueFromCents(cents) {
  if (cents === null || cents === undefined || cents === '') return '';
  return Number(cents) / 100;
}
