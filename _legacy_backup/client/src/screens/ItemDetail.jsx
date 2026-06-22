import { useEffect, useState, useCallback } from 'react';
import {
  IconArrowRight, IconTag, IconDoor, IconCoin, IconFlag,
  IconCheck, IconAlertTriangle, IconDeviceFloppy, IconClock, IconHistory,
  IconLock, IconLockOpen, IconChevronLeft
} from '@tabler/icons-react';
import { api } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { money, valueFromCents } from '../utils/format.js';

const STATUSES = ['غير مسعّر', 'قيد العمل', 'بحاجة مراجعة', 'معتمد', 'مؤجّل'];

/* ── حقل رقمي بوحدة جانبية ── */
function NumField({ label, value, onChange, disabled, unit, hint, wide }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <label style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{label}</label>
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `0.5px solid ${disabled ? 'var(--color-border-tertiary)' : 'var(--color-border-secondary)'}`,
        borderRadius: 'var(--border-radius-md)', overflow: 'hidden',
        background: disabled ? 'var(--color-background-secondary)' : '#fff',
        width: wide ? '100%' : undefined,
      }}>
        <input
          type="number" value={value || ''} disabled={disabled}
          onChange={e => onChange(e.target.value)}
          style={{ border: 'none', outline: 'none', padding: '7px 10px', fontSize: 13, background: 'transparent', width: wide ? '100%' : 110, direction: 'ltr', textAlign: 'left' }}
        />
        {unit && (
          <span style={{ padding: '0 8px', fontSize: 12, color: 'var(--color-text-tertiary)', borderRight: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', whiteSpace: 'nowrap', alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>
            {unit}
          </span>
        )}
      </div>
      {hint && <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{hint}</span>}
    </div>
  );
}

/* ── صندوق نتيجة محسوبة ── */
function ResultBox({ label, value, highlight }) {
  return (
    <div style={{
      background: highlight ? '#EAF3DE' : 'var(--color-background-secondary)',
      border: `0.5px solid ${highlight ? '#c3dba8' : 'var(--color-border-tertiary)'}`,
      borderRadius: 'var(--border-radius-md)', padding: '8px 12px',
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <span style={{ fontSize: 11, color: highlight ? '#3B6D11' : 'var(--color-text-tertiary)' }}>{label}</span>
      <b style={{ fontSize: 16, fontWeight: 600, color: highlight ? '#173404' : 'var(--color-text-primary)', direction: 'ltr', textAlign: 'left' }}>{value || '—'}</b>
    </div>
  );
}

export default function ItemDetail({ code, back, openDetail, setToast }) {
  const [form, setForm]         = useState(null);
  const [categories, setCategories] = useState([]);
  const [history, setHistory]   = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    if (!code) return;
    api.item(code).then(it => {
      setForm({
        ...it,
        cost_price:               valueFromCents(it.cost_price_cents),
        final_selling_price:      valueFromCents(it.final_selling_price_cents),
        price_per_m2:             valueFromCents(it.price_per_m2_cents),
        price_without_installation: valueFromCents(it.price_without_installation_cents),
        installation_fee:         valueFromCents(it.installation_fee_cents),
        price_with_installation:  valueFromCents(it.price_with_installation_cents),
      });
    });
  }, [code]);

  useEffect(() => { load(); api.categories().then(setCategories); }, [load]);

  const mainCats = categories.filter(c => c.type === 'main' && c.is_active);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const locked = form && Number(form.price_locked) === 1;

  /* حسابات الباب */
  const w    = parseFloat(form?.width)  || 0;
  const h    = parseFloat(form?.height) || 0;
  const pm   = parseFloat(form?.price_per_m2) || 0;
  const fee  = parseFloat(form?.installation_fee) || 0;
  const area    = w * h;
  const priceWo = area * pm;
  const priceWi = priceWo + fee;

  /* حسابات التكلفة */
  const cost      = parseFloat(form?.cost_price) || 0;
  const margin    = parseFloat(form?.profit_margin_percent) || 0;
  const suggested = cost > 0 && margin > 0 ? cost * (1 + margin / 100) : 0;
  const finalPrice = parseFloat(form?.final_selling_price) || 0;
  const belowCost  = finalPrice > 0 && finalPrice < cost;

  async function saveItem(goNext = false) {
    setSaving(true);
    try {
      const saved = await api.saveItem(code, form);
      setToast('تم الحفظ');
      if (goNext) {
        const n = await api.next({ main_category: saved.main_category || '' });
        n?.item_code ? openDetail(n.item_code) : (setToast('لا يوجد صنف تالٍ'), back());
      } else load();
    } catch (e) { setToast('خطأ: ' + e.message); }
    setSaving(false);
  }

  async function approve() {
    setSaving(true);
    try { await api.approve(code); setToast('تم اعتماد التسعير وتثبيت السعر'); load(); }
    catch (e) { setToast('خطأ: ' + e.message); }
    setSaving(false);
  }

  async function sendForReview() {
    const reason = prompt('سبب الإرسال للمراجعة');
    if (!reason) return;
    await api.status(code, { status: 'بحاجة مراجعة', reason });
    setToast('تم الإرسال للمراجعة'); load();
  }

  async function postpone() {
    if (!confirm('تأجيل هذا الصنف؟')) return;
    await api.status(code, { status: 'مؤجّل' });
    setToast('تم التأجيل'); load();
  }

  async function unlock() {
    const reason = prompt('سبب فك التثبيت');
    if (!reason) return;
    await api.unlock(code, reason);
    setToast('تم فك التثبيت'); load();
  }

  async function goNext() {
    const n = await api.next({ main_category: form?.main_category || '' });
    n?.item_code ? openDetail(n.item_code) : setToast('لا يوجد صنف تالٍ');
  }

  if (!form) return <p style={{ padding: 16, color: 'var(--color-text-tertiary)' }}>جاري التحميل…</p>;

  return (
    <div style={{ maxWidth: 680 }}>

      {/* ── شريط التنقل ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 13 }} onClick={back}>
            <IconArrowRight size={15} />الأصناف
          </button>
          <span style={{ color: 'var(--color-text-tertiary)' }}>/</span>
          <StatusBadge status={form.pricing_status} />
        </div>
        <button className="btn" onClick={goNext}>
          <IconChevronLeft size={15} />الصنف التالي
        </button>
      </div>

      {/* ── عنوان الصنف ── */}
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 600 }}>
          {form.approved_name || form.original_name}
        </h3>
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          الكود: <span className="ltr" style={{ fontFamily: 'monospace' }}>{form.item_code}</span>
          {' · '}الوحدة: {form.unit || form.original_unit}
        </span>
      </div>

      {/* ── تنبيه التثبيت ── */}
      {locked && (
        <div className="locked-banner" style={{ marginBottom: 12 }}>
          <IconLock size={15} />
          السعر مثبّت — اضغط "فك التثبيت" لتعديل الأسعار
        </div>
      )}

      {/* ══════════════════════════════════════════
          المجموعة 1: التصنيف والاسم
      ══════════════════════════════════════════ */}
      <div className="grp">
        <div className="grp-header"><IconTag size={15} />التصنيف والاسم</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 3 }}>التصنيف</label>
            <select value={form.main_category || ''} onChange={e => set('main_category', e.target.value)}
              style={{ width: '100%', fontSize: 13, padding: '7px 9px' }}>
              <option value="">— بدون تصنيف —</option>
              {mainCats.map(c => <option key={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 3 }}>الوحدة</label>
            <input value={form.unit || form.original_unit || ''} onChange={e => set('unit', e.target.value)}
              style={{ width: 90, fontSize: 13, padding: '7px 9px' }} />
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 3 }}>الاسم الأصلي (من الملف)</label>
          <div style={{ padding: '7px 10px', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            {form.original_name}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 3 }}>الاسم المعتمد</label>
          <input value={form.approved_name || ''} onChange={e => set('approved_name', e.target.value)}
            placeholder="اكتب الاسم المنقّح هنا…"
            style={{ width: '100%', fontSize: 13, padding: '7px 9px' }} />
        </div>
      </div>

      {/* ══════════════════════════════════════════
          المجموعة 2: تسعير الباب
      ══════════════════════════════════════════ */}
      <div className="grp">
        <div className="grp-header">
          <IconDoor size={15} />
          <label style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={!!form.door_pricing_enabled}
              onChange={e => set('door_pricing_enabled', e.target.checked ? 1 : 0)} />
            تسعير الباب بالمتر المربع
          </label>
        </div>

        {!!form.door_pricing_enabled && (
          <div style={{ marginTop: 4 }}>
            {/* صف 1: الأبعاد وسعر المتر */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <NumField label="العرض" value={form.width} onChange={v => set('width', v)} disabled={locked} unit="م" />
              <NumField label="الارتفاع" value={form.height} onChange={v => set('height', v)} disabled={locked} unit="م" />
              <NumField label="سعر المتر المربع" value={form.price_per_m2} onChange={v => set('price_per_m2', v)} disabled={locked} unit="₪" />
            </div>

            {/* صف 2: نتائج + أجرة التركيب */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <ResultBox label="المساحة" value={area > 0 ? `${area.toFixed(2)} م²` : null} />
              <ResultBox label="السعر بدون تركيب" value={priceWo > 0 ? Math.round(priceWo).toLocaleString('en') + ' ₪' : null} />
              <NumField label="أجرة التركيب" value={form.installation_fee} onChange={v => set('installation_fee', v)} disabled={locked} unit="₪" />
            </div>

            {/* نتيجة نهائية */}
            {priceWi > 0 && (
              <div style={{ marginTop: 10 }}>
                <ResultBox label="السعر مع التركيب" value={Math.round(priceWi).toLocaleString('en') + ' ₪'} highlight />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          المجموعة 3: التكلفة والسعر
      ══════════════════════════════════════════ */}
      <div className="grp">
        <div className="grp-header"><IconCoin size={15} />التكلفة والسعر</div>

        {/* صف 1: التكلفة + الهامش → السعر المقترح */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 10, flexWrap: 'wrap' }}>
          <NumField label="التكلفة" value={form.cost_price} onChange={v => set('cost_price', v)} disabled={locked} unit="₪" />
          <NumField label="هامش الربح" value={form.profit_margin_percent} onChange={v => set('profit_margin_percent', v)} disabled={locked} unit="%" />
          <ResultBox label="السعر المقترح" value={suggested > 0 ? suggested.toFixed(2) + ' ₪' : null} />
        </div>

        {/* صف 2: السعر النهائي — أبرز حقل في الشاشة */}
        <div>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, fontWeight: 500 }}>
            السعر النهائي للبيع
          </label>
          <div style={{
            display: 'flex', alignItems: 'center',
            border: `1.5px solid ${locked ? 'var(--color-border-tertiary)' : 'var(--brand)'}`,
            borderRadius: 'var(--border-radius-md)', overflow: 'hidden',
            background: locked ? 'var(--color-background-secondary)' : '#fff',
            maxWidth: 220,
          }}>
            <input
              type="number" value={form.final_selling_price || ''} disabled={locked}
              onChange={e => set('final_selling_price', e.target.value)}
              style={{ border: 'none', outline: 'none', padding: '10px 12px', fontSize: 16, fontWeight: 600, background: 'transparent', width: '100%', direction: 'ltr', textAlign: 'left' }}
            />
            <span style={{ padding: '0 12px', fontSize: 14, color: 'var(--color-text-tertiary)', borderRight: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>₪</span>
          </div>
          {belowCost && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#854F0B' }}>⚠ السعر النهائي أقل من التكلفة</p>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          المجموعة 4: الحالة والملاحظات
      ══════════════════════════════════════════ */}
      <div className="grp">
        <div className="grp-header"><IconFlag size={15} />الحالة والملاحظات</div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 3 }}>حالة التسعير</label>
            <select value={form.pricing_status || 'غير مسعّر'} onChange={e => set('pricing_status', e.target.value)}
              style={{ fontSize: 13, padding: '7px 9px', width: 160 }}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {form.last_modified_by && (
            <div style={{ paddingTop: 18, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
              آخر تعديل: {form.last_modified_by} · {form.last_modified_at?.slice(0, 16)}
            </div>
          )}
        </div>

        {form.review_reason && (
          <div style={{ padding: '7px 10px', background: '#FAEEDA', borderRadius: 'var(--border-radius-md)', fontSize: 12, color: '#854F0B', marginBottom: 8 }}>
            سبب المراجعة: {form.review_reason}
          </div>
        )}

        <div>
          <label style={{ fontSize: 11, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 3 }}>ملاحظات</label>
          <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)}
            placeholder="أي ملاحظة على هذا الصنف…"
            style={{ width: '100%', minHeight: 60, fontSize: 13, padding: '7px 9px', resize: 'vertical' }} />
        </div>
      </div>

      {/* ══════════════════════════════════════════
          أزرار الإجراءات
      ══════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4, paddingBottom: 24 }}>
        <button className="btn btn-primary" onClick={approve} disabled={saving} style={{ fontSize: 13, padding: '9px 16px' }}>
          <IconCheck size={16} />اعتماد التسعير
        </button>
        <button className="btn" onClick={() => saveItem(true)} disabled={saving} style={{ fontSize: 13, padding: '9px 16px' }}>
          <IconDeviceFloppy size={16} />حفظ والتالي
        </button>
        <button className="btn" onClick={() => saveItem(false)} disabled={saving}>
          <IconDeviceFloppy size={15} />حفظ مسودة
        </button>
        <button className="btn btn-review" onClick={sendForReview}>
          <IconAlertTriangle size={15} />بحاجة مراجعة
        </button>
        <button className="btn btn-ghost" onClick={postpone}>
          <IconClock size={15} />تأجيل
        </button>
        {locked && (
          <button className="btn" style={{ color: '#854F0B' }} onClick={unlock}>
            <IconLockOpen size={15} />فك التثبيت
          </button>
        )}
        <button className="btn btn-ghost" onClick={async () => { const r = await api.priceHistory(code); setHistory(r); setShowHistory(true); }}>
          <IconHistory size={15} />سجل التعديلات
        </button>
      </div>

      {/* ── سجل الأسعار ── */}
      {showHistory && (
        <div className="grp" style={{ marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <b style={{ fontSize: 13 }}>سجل الأسعار</b>
            <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => setShowHistory(false)}>×</button>
          </div>
          {history.length === 0
            ? <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>لا يوجد سجل بعد</p>
            : <table className="tbl">
                <thead><tr><th>التاريخ</th><th>المستخدم</th><th>السعر القديم</th><th>السعر الجديد</th><th>السبب</th></tr></thead>
                <tbody>
                  {history.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontSize: 11 }}>{r.changed_at?.slice(0, 16)}</td>
                      <td>{r.changed_by}</td>
                      <td className="ltr">{money(r.old_price_cents)}</td>
                      <td className="ltr">{money(r.new_price_cents)}</td>
                      <td style={{ fontSize: 11 }}>{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      )}
    </div>
  );
}
