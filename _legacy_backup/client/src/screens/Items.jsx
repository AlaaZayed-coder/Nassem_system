import { useEffect, useState, useCallback } from 'react';
import {
  IconSearch, IconCategory, IconFlag, IconDoor,
  IconUpload, IconDownload, IconChevronLeft, IconChevronDown, IconCheckbox
} from '@tabler/icons-react';
import { api } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { money } from '../utils/format.js';

const STATUSES = ['معتمد', 'قيد العمل', 'بحاجة مراجعة', 'غير مسعّر', 'مؤجّل'];

export default function Items({ initialFilters = {}, openDetail, setToast }) {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pageSize: 50 });
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);
  const [importPreview, setImportPreview] = useState(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const load = useCallback(() => {
    api.items({ ...filters, page: filters.page || 1 }).then(setData);
  }, [JSON.stringify(filters)]);

  useEffect(() => { setFilters(initialFilters); setSelected([]); }, [JSON.stringify(initialFilters)]);
  useEffect(() => { load(); api.categories().then(setCategories); }, [load]);

  const mainCats = categories.filter(c => c.type === 'main' && c.is_active);

  async function previewFile(file) {
    const form = new FormData();
    form.append('file', file);
    try {
      const p = await api.previewImport(form);
      setImportPreview(p);
    } catch (e) { setToast('خطأ في معاينة الملف: ' + e.message); }
  }

  async function confirmImport() {
    try {
      await api.confirmImport(importPreview.filePath);
      setImportPreview(null);
      load();
      setToast('تم الاستيراد بنجاح');
    } catch (e) { setToast('فشل الاستيراد: ' + e.message); }
  }

  async function exportNow(format) {
    try {
      const r = await api.exportFile({ filters, format });
      window.open(r.file, '_blank');
      setToast('تم إنشاء ملف التصدير');
    } catch (e) { setToast('فشل التصدير'); }
  }

  function toggleSelect(code) {
    setSelected(s => s.includes(code) ? s.filter(x => x !== code) : [...s, code]);
  }

  async function bulkAction(patch) {
    if (!selected.length) return;
    if (!confirm(`تطبيق التعديل على ${selected.length} صنف؟`)) return;
    await api.bulk({ codes: selected, patch });
    setToast('تم تنفيذ التعديل الجماعي');
    setSelected([]);
    load();
  }

  const totalPages = Math.ceil(data.total / data.pageSize) || 1;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 className="section-title">الأصناف</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <label className="btn" style={{ cursor: 'pointer', marginBottom: 0 }}>
            <IconUpload size={14} />استيراد CSV
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={e => previewFile(e.target.files[0])} />
          </label>
          <button className="btn" onClick={() => exportNow('xlsx')}><IconDownload size={14} />تصدير Excel</button>
          <button className="btn" onClick={() => exportNow('csv')}><IconDownload size={14} />تصدير CSV</button>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar">
        <div className="search-field" style={{ minWidth: 160 }}>
          <IconSearch size={14} />
          <input
            placeholder="بحث بالكود أو الاسم…"
            value={filters.search || ''}
            onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })}
          />
        </div>

        <div style={{ position: 'relative' }}>
          <div className={`chip${filters.pricing_status ? ' active' : ''}`} onClick={() => setStatusOpen(o => !o)}>
            <IconFlag size={13} />
            {filters.pricing_status || 'الحالة'}
            <IconChevronDown size={13} />
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
            <IconCategory size={13} />
            {filters.main_category || 'التصنيف'}
            <IconChevronDown size={13} />
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
          <IconDoor size={13} />
          تركيب فقط
        </div>
      </div>

      {/* Import preview */}
      {importPreview && (
        <div className="import-panel">
          <b style={{ fontSize: 13 }}>معاينة الاستيراد</b>
          <p style={{ fontSize: 12, margin: '6px 0' }}>
            الإجمالي: {importPreview.totalRows} · جديد: {importPreview.newItems} · موجود: {importPreview.existingItems} · يحتاج تنظيف: {importPreview.garbage} · تعارضات: {importPreview.conflicts}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={confirmImport}>تأكيد الاستيراد</button>
            <button className="btn" onClick={() => setImportPreview(null)}>إلغاء</button>
          </div>
        </div>
      )}

      {/* Bulk bar */}
      {selected.length > 0 && (
        <div className="bulk-bar">
          <span style={{ color: '#0C447C' }}>
            <IconCheckbox size={14} style={{ verticalAlign: -2 }} /> محدّد: {selected.length} صنف
          </span>
          <div className="bulk-actions">
            <select style={{ fontSize: 12, padding: '3px 6px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)' }}
              onChange={e => e.target.value && bulkAction({ main_category: e.target.value })}>
              <option value="">تعيين تصنيف</option>
              {mainCats.map(c => <option key={c.id}>{c.name}</option>)}
            </select>
            <select style={{ fontSize: 12, padding: '3px 6px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)' }}
              onChange={e => e.target.value && bulkAction({ pricing_status: e.target.value })}>
              <option value="">تغيير حالة</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 28 }}></th>
            <th style={{ width: 64 }}>الكود</th>
            <th>الصنف</th>
            <th style={{ width: 96 }}>الحالة</th>
            <th style={{ width: 66 }} className="num">السعر</th>
            <th style={{ width: 28 }}></th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map(item => (
            <tr key={item.item_code} onClick={() => openDetail(item.item_code)}>
              <td onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={selected.includes(item.item_code)}
                  onChange={() => toggleSelect(item.item_code)} />
              </td>
              <td className="code ltr">{item.item_code}</td>
              <td>
                {item.approved_name || item.original_name}
                <div className="item-sub">{item.unit || item.original_unit}</div>
              </td>
              <td><StatusBadge status={item.pricing_status} /></td>
              <td className="num">{money(item.final_selling_price_cents) || '—'}</td>
              <td className="icon-cell"><IconChevronLeft size={14} /></td>
            </tr>
          ))}
          {data.rows.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-tertiary)' }}>لا توجد نتائج</td></tr>
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
