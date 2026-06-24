export const STATUSES = ['غير مسعّر','قيد المراجعة','بحاجة مراجعة','معتمد','مؤجّل'] as const;
export const PRICING_METHODS = ['تكلفة + هامش','يدوي','خدمة','حسب المتر المربع','حسب المتر الطولي','بحاجة مراجعة'] as const;

export function moneyToCents(value: any): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function centsToMoney(value: any): number | string {
  if (value === null || value === undefined || value === '') return '';
  return Number(value) / 100;
}

export function roundCentsToShekel(cents: number): number {
  return Math.round(cents / 100) * 100;
}

export function calculateSuggested(costCents: number | null, marginPercent: number): number | null {
  if (costCents === null || costCents === undefined) return null;
  const margin = Number(marginPercent || 0);
  return roundCentsToShekel(Math.round(costCents * (1 + margin / 100)));
}

export function calculateDoor(fields: any) {
  const enabled = !!fields.door_pricing_enabled;
  if (!enabled) return { area: null, price_without_installation_cents: null, price_with_installation_cents: null };

  const width = Number(fields.width || 0);
  const height = Number(fields.height || 0);
  const area = fields.door_unit_type === 'متر مربع'
    ? Number((width * height).toFixed(3))
    : Number(fields.area || 0) || null;

  let without: number | null = fields.price_without_installation_cents ?? null;
  let withInstall: number | null = fields.price_with_installation_cents ?? null;
  const install = fields.installation_fee_cents ?? 0;

  if (!fields.manual_price_override) {
    if (fields.door_unit_type === 'قطعة') {
      withInstall = without === null ? null : without + install;
    }
    if (fields.door_unit_type === 'متر مربع' && area) {
      without = fields.price_per_m2_cents == null ? null : Math.round(area * fields.price_per_m2_cents);
      if (without !== null) {
        withInstall = fields.installation_type === 'لكل متر مربع'
          ? without + Math.round(area * install)
          : without + install;
      }
    }
  }
  return { area, price_without_installation_cents: without, price_with_installation_cents: withInstall };
}

export function validateApproval(item: any): string | null {
  if (item.door_pricing_enabled) {
    if (item.price_without_installation_cents == null || item.price_with_installation_cents == null) {
      return 'لا يمكن اعتماد تسعير الباب قبل إدخال سعر بدون تركيب وسعر مع التركيب';
    }
  } else if (item.final_selling_price_cents == null) {
    return 'أدخل سعر البيع النهائي قبل الاعتماد';
  }
  return null;
}
