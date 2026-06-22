import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function Categories({ setPage, setToast }) {
  const [cats, setCats] = useState([]);
  const [dash, setDash] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'main' });

  const load = () => Promise.all([api.categories(), api.dashboard()]).then(([c, d]) => { setCats(c); setDash(d); });
  useEffect(load, []);

  async function add() {
    if (!form.name.trim()) return;
    await api.addCategory(form);
    setToast('تمت إضافة التصنيف');
    setForm({ name: '', type: 'main' });
    load();
  }

  const stats = Object.fromEntries((dash?.categories || []).map(r => [r.category, r]));
  const mainCats = cats.filter(c => c.type === 'main' && c.is_active);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 className="section-title">التصنيفات</h3>
        <button className="btn" onClick={() => setPage('items', { no_category: '1' })}>أصناف بدون تصنيف</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 16 }}>
        {mainCats.map(c => {
          const s = stats[c.name] || { total: 0, approved: 0 };
          const pct = s.total ? Math.round((s.approved || 0) / s.total * 100) : 0;
          return (
            <button key={c.id} onClick={() => setPage('items', { main_category: c.name })}
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

      <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: 12 }}>
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
                    onClick={async () => { await api.updateCategory(r.id, { is_active: r.is_active ? 0 : 1 }); load(); }}>
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
