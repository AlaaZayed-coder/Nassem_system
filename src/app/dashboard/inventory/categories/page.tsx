"use client";

import { useEffect, useState } from 'react';
import { fetchLegacyCategories, fetchLegacyDashboardStats, updateLegacyCategory, addLegacyCategory } from '../legacy-actions';

export default function CategoriesPage() {
  const [cats, setCats] = useState<any[]>([]);
  const [dash, setDash] = useState<any>(null);
  const [form, setForm] = useState({ name: '', type: 'main' });
  const [toast, setToast] = useState('');

  const load = () => {
    Promise.all([fetchLegacyCategories(), fetchLegacyDashboardStats()]).then(([c, d]) => {
      setCats(c);
      setDash(d);
    });
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function add() {
    if (!form.name.trim()) return;
    try {
      await addLegacyCategory(form);
      setToast('تمت إضافة التصنيف');
      setForm({ name: '', type: 'main' });
      load();
    } catch (e: any) {
      setToast('خطأ: ' + e.message);
    }
  }

  // The fix for the crash: Ensure we fallback gracefully if dash or stats is undefined
  const stats = Object.fromEntries((dash?.categories || []).map((r: any) => [r.category, r]));
  const mainCats = cats.filter(c => c.type === 'main' && c.is_active);

  return (
    <div className="legacy-wrapper">
      {toast && <div className="toast">{toast}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 className="section-title">التصنيفات</h3>
        <button className="btn" onClick={() => window.location.href = '/dashboard/inventory/items?no_category=1'}>أصناف بدون تصنيف</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 16 }}>
        {mainCats.map(c => {
          // Bugfix: added fallback for undefined stats
          const s = stats[c.name] || { total: 0, approved: 0, unpriced: 0 };
          const pct = s.total ? Math.round((s.approved || 0) / s.total * 100) : 0;
          return (
            <button key={c.id} onClick={() => window.location.href = `/dashboard/inventory/items?main_category=${encodeURIComponent(c.name)}`}
              style={{ textAlign: 'right', padding: 12, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <b style={{ fontSize: 13 }}>{c.name}</b>
              <span style={{ fontSize: 20, fontWeight: 600 }}>{s.total}</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>معتمد {s.approved || 0} · غير مسعّر {s.unpriced || 0}</span>
              <div style={{ height: 6, background: 'var(--color-border-tertiary)', borderRadius: 4, overflow: 'hidden', marginTop: 2 }}>
                <div style={{ height: '100%', background: 'var(--brand)', width: `${pct}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: 12, background: 'var(--color-background-primary)' }}>
        <b style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>إدارة التصنيفات</b>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input placeholder="اسم التصنيف" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ flex: 1 }} />
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ width: 100 }}>
            <option value="main">رئيسي</option>
            <option value="sub">فرعي</option>
          </select>
          <button className="btn btn-primary" onClick={add}>إضافة</button>
        </div>
        <table className="tbl">
          <thead><tr><th>الاسم</th><th>النوع</th><th style={{ width: 60 }}>الحالة</th><th style={{ width: 80 }}></th></tr></thead>
          <tbody>
            {cats.map(r => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td style={{ fontSize: 11 }}>{r.type === 'main' ? 'رئيسي' : 'فرعي'}</td>
                <td style={{ fontSize: 11 }}>{r.is_active ? 'نشط' : 'معطل'}</td>
                <td>
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}
                    onClick={async () => { await updateLegacyCategory(r.id, { is_active: !r.is_active }); load(); }}>
                    تبديل
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
