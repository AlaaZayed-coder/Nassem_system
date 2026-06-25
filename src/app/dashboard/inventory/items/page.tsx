"use client";

import { useEffect, useState, useCallback } from 'react';
import {
  Search, Grid, Flag, DoorOpen,
  Upload, Download, ChevronLeft, ChevronDown, CheckSquare, Snowflake
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { StatusBadge } from '@/components/legacy-status-badge';
import { fetchLegacyItems, fetchUnifiedCategories, bulkUpdateLegacyItems } from '../legacy-actions';

const STATUSES = ['معتمد', 'قيد المراجعة', 'غير مسعّر'];

function money(cents: number) {
  if (!cents && cents !== 0) return '';
  return (cents / 100).toFixed(2);
}

import { Suspense } from 'react';

function ItemsContent() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<any>({
    page: 1,
    main_category: searchParams.get('main_category') || '',
    no_category: searchParams.get('no_category') || '',
    pricing_status: searchParams.get('pricing_status') || '',
    show_frozen: searchParams.get('show_frozen') === '1',
  });
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pageSize: 50 });
  const [categories, setCategories] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  
  const [statusOpen, setStatusOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(() => {
    fetchLegacyItems({ ...filters, page: filters.page || 1 }).then((res: any) => setData(res));
  }, [filters]);

  useEffect(() => {
    load();
    fetchUnifiedCategories().then(setCategories);
  }, [load]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const mainCats = categories.filter(c => c.is_active !== false);

  function toggleSelect(code: string) {
    setSelected(s => s.includes(code) ? s.filter(x => x !== code) : [...s, code]);
  }

  async function bulkAction(patch: any) {
    if (!selected.length) return;
    if (!confirm(`تطبيق التعديل على ${selected.length} صنف؟`)) return;
    await bulkUpdateLegacyItems(selected, patch);
    setToast('تم تنفيذ التعديل الجماعي بنجاح');
    setSelected([]);
    load();
  }

  const totalPages = Math.ceil(data.total / data.pageSize) || 1;

  return (
    <div className="legacy-wrapper">
      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 className="section-title">الأصناف</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <label className="btn" style={{ cursor: 'pointer', marginBottom: 0 }}>
            <Upload size={14} />استيراد CSV
            <input type="file" accept=".csv" style={{ display: 'none' }} />
          </label>
          <button className="btn" onClick={() => setToast('قيد التطوير')}><Download size={14} />تصدير Excel</button>
          <button className="btn" onClick={() => setToast('قيد التطوير')}><Download size={14} />تصدير CSV</button>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar">
        <div className="search-field" style={{ minWidth: 160 }}>
          <Search size={14} />
          <input
            placeholder="بحث بالكود أو الاسم…"
            value={filters.search || ''}
            onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })}
          />
        </div>

        <div style={{ position: 'relative' }}>
          <div className={`chip${filters.pricing_status ? ' active' : ''}`} onClick={() => setStatusOpen(o => !o)}>
            <Flag size={13} />
            {filters.pricing_status || 'الحالة'}
            <ChevronDown size={13} />
          </div>
          {statusOpen && (
            <div style={{ position: 'absolute', top: '110%', right: 0, background: '#fff', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', zIndex: 20, minWidth: 130, padding: 4 }}>
              <div style={{ padding: '5px 10px', fontSize: 12, cursor: 'pointer' }} onClick={() => { setFilters({ ...filters, pricing_status: '', page: 1 }); setStatusOpen(false); }}>كل الحالات</div>
              {STATUSES.map(s => (
                <div key={s} style={{ padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}
                  onClick={() => { setFilters({ ...filters, pricing_status: s, page: 1 }); setStatusOpen(false); }}>
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <div className={`chip${filters.main_category ? ' active' : ''}`} onClick={() => setCatOpen(o => !o)}>
            <Grid size={13} />
            {filters.main_category || 'التصنيف'}
            <ChevronDown size={13} />
          </div>
          {catOpen && (
            <div style={{ position: 'absolute', top: '110%', right: 0, background: '#fff', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', zIndex: 20, minWidth: 160, padding: 4, maxHeight: 200, overflowY: 'auto' }}>
              <div style={{ padding: '5px 10px', fontSize: 12, cursor: 'pointer' }} onClick={() => { setFilters({ ...filters, main_category: '', page: 1 }); setCatOpen(false); }}>كل التصنيفات</div>
              {mainCats.map(c => (
                <div key={c.id} style={{ padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}
                  onClick={() => { setFilters({ ...filters, main_category: c.name, page: 1 }); setCatOpen(false); }}>
                  {c.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`chip${filters.door_pricing_enabled === '1' ? ' active' : ''}`}
          onClick={() => setFilters({ ...filters, door_pricing_enabled: filters.door_pricing_enabled === '1' ? '' : '1', page: 1 })}>
          <DoorOpen size={13} />
          تركيب فقط
        </div>

        <div
          className={`chip${filters.show_frozen ? ' active' : ''}`}
          style={filters.show_frozen ? { background: '#EEF6FF', color: '#1D4ED8', borderColor: '#93C5FD' } : {}}
          onClick={() => setFilters({ ...filters, show_frozen: !filters.show_frozen, page: 1 })}>
          <Snowflake size={13} />
          المجمّدة
        </div>
      </div>

      {/* Bulk bar */}
      {selected.length > 0 && (
        <div className="bulk-bar">
          <span style={{ color: '#0C447C' }}>
            <CheckSquare size={14} style={{ verticalAlign: -2 }} /> محدّد: {selected.length} صنف
          </span>
          <div className="bulk-actions">
            <select style={{ fontSize: 12, padding: '3px 6px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)' }}
              onChange={e => e.target.value && bulkAction({ main_category: e.target.value })}>
              <option value="">تعيين تصنيف</option>
              {mainCats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <select style={{ fontSize: 12, padding: '3px 6px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)' }}
              onChange={e => e.target.value && bulkAction({ pricing_status: e.target.value })}>
              <option value="">تغيير حالة</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <table className="tbl" style={{ tableLayout: 'fixed', width: '100%' }}>
        <colgroup>
          <col style={{ width: 28 }} />
          <col style={{ width: 80 }} />
          <col />
          <col style={{ width: 62 }} />
          <col style={{ width: 58 }} />
          <col style={{ width: 108 }} />
          <col style={{ width: 20 }} />
        </colgroup>
        <thead>
          <tr style={{ background: 'var(--color-background-secondary)' }}>
            <th style={{ padding: '9px 6px' }}></th>
            <th style={{ padding: '9px 8px', fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', textAlign: 'right' }}>الكود</th>
            <th style={{ padding: '9px 8px', fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', textAlign: 'right' }}>الصنف</th>
            <th style={{ padding: '9px 8px', fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>المتوفر</th>
            <th style={{ padding: '9px 8px', fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>الوحدة</th>
            <th style={{ padding: '9px 8px', fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', textAlign: 'left' }}>الحالة / السعر</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((item: any, idx: number) => {
            const totalQty = Array.isArray(item.erp_inventory)
              ? item.erp_inventory.reduce((s: number, r: any) => s + (r.quantity || 0), 0)
              : 0;
            const isEven = idx % 2 === 0;
            return (
              <tr key={item.item_code}
                style={{
                  cursor: 'pointer',
                  background: isEven ? 'var(--color-background-primary)' : 'var(--color-background-secondary)',
                  opacity: item.is_frozen ? 0.6 : 1,
                  borderBottom: '0.5px solid var(--color-border-tertiary)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-background-info)')}
                onMouseLeave={e => (e.currentTarget.style.background = isEven ? 'var(--color-background-primary)' : 'var(--color-background-secondary)')}
                onClick={() => window.location.href = `/dashboard/inventory/items/${encodeURIComponent(item.item_code)}`}>

                {/* checkbox */}
                <td style={{ padding: '10px 6px', textAlign: 'center', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.includes(item.item_code)}
                    onChange={() => toggleSelect(item.item_code)} style={{ margin: 0 }} />
                </td>

                {/* الكود */}
                <td style={{ padding: '10px 8px', verticalAlign: 'middle', overflow: 'hidden' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-tertiary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.item_code}
                  </span>
                </td>

                {/* الصنف + ملحق + تصنيف */}
                <td style={{ padding: '10px 8px', verticalAlign: 'middle', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
                    <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.approved_name || item.original_name}
                    </span>
                    {item.is_frozen && (
                      <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 10, padding: '1px 5px', borderRadius: 20, background: '#EEF6FF', color: '#1D4ED8', fontWeight: 600 }}>
                        <Snowflake size={9} /> مجمّد
                      </span>
                    )}
                  </div>
                  {item.name_suffix && (
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name_suffix}
                    </div>
                  )}
                  {item.main_category && (
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.main_category}
                    </div>
                  )}
                </td>

                {/* المتوفر */}
                <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: totalQty > 0 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
                    {totalQty > 0 ? totalQty.toLocaleString('en') : '—'}
                  </span>
                </td>

                {/* الوحدة */}
                <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                    {item.unit_of_measure || 'قطعة'}
                  </span>
                </td>

                {/* الحالة + السعر */}
                <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                  <StatusBadge status={item.pricing_status} />
                  <div style={{ marginTop: 4, fontWeight: 600, fontSize: 13, color: item.final_selling_price_cents ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)', direction: 'ltr', textAlign: 'left' }}>
                    {item.final_selling_price_cents ? `${money(item.final_selling_price_cents)} ₪` : '—'}
                  </div>
                  {item.cost_price_cents ? (
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', direction: 'ltr', textAlign: 'left' }}>
                      ت: {money(item.cost_price_cents)}
                    </div>
                  ) : null}
                </td>

                <td style={{ padding: '10px 6px', textAlign: 'center', verticalAlign: 'middle', color: 'var(--color-text-tertiary)' }}>
                  <ChevronLeft size={13} />
                </td>
              </tr>
            );
          })}
          {data.rows.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-tertiary)', fontSize: 13 }}>لا توجد نتائج</td></tr>
          )}
        </tbody>
      </table>

      {/* Pager */}
      <div className="pager">
        <button className="btn" disabled={data.page <= 1} onClick={() => setFilters({ ...filters, page: data.page - 1 })}>السابق</button>
        <span>{data.page} / {totalPages} ({data.total.toLocaleString('ar')} صنف)</span>
        <button className="btn" disabled={data.page >= totalPages} onClick={() => setFilters({ ...filters, page: data.page + 1 })}>التالي</button>
      </div>
    </div>
  );
}

export default function ItemsPage() {
  return (
    <Suspense fallback={<div className="p-4">جاري التحميل...</div>}>
      <ItemsContent />
    </Suspense>
  );
}
