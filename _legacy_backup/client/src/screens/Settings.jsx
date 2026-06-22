import { useEffect, useState } from 'react';
import { IconDeviceFloppy, IconDatabaseExport } from '@tabler/icons-react';
import { api } from '../api/client.js';

export default function SettingsScreen({ setToast }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.settings().then(setData); }, []);
  if (!data) return null;

  const s = data.settings || {};
  function set(k, v) { setData({ ...data, settings: { ...s, [k]: v } }); }

  return (
    <div>
      <h3 className="section-title" style={{ marginBottom: 12 }}>الإعدادات</h3>

      <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: 14, maxWidth: 480 }}>
        <div style={{ marginBottom: 10 }}>
          <label className="lbl">هامش افتراضي %</label>
          <input type="number" value={s.default_margin_percent || ''} className="ltr"
            onChange={e => set('default_margin_percent', e.target.value)} style={{ width: 120 }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label className="lbl">قاعدة التقريب</label>
          <select value={s.rounding_rule || 'nearest_1'} onChange={e => set('rounding_rule', e.target.value)} style={{ width: 200 }}>
            <option value="nearest_1">أقرب شيكل</option>
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label className="lbl">الأسعار شاملة ضريبة؟</label>
          <select value={s.tax_inclusive || 'false'} onChange={e => set('tax_inclusive', e.target.value)} style={{ width: 200 }}>
            <option value="false">لا</option>
            <option value="true">نعم (إعداد مستقبلي)</option>
          </select>
        </div>
        <p className="warn" style={{ fontSize: 12, marginBottom: 10 }}>لا يتم احتساب الضريبة في النسخة الحالية.</p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={async () => { await api.saveSettings(s); setToast('تم حفظ الإعدادات'); }}>
            <IconDeviceFloppy size={15} />حفظ
          </button>
          <button className="btn" onClick={async () => { await api.backup(); setToast('تم إنشاء نسخة احتياطية'); }}>
            <IconDatabaseExport size={15} />نسخة احتياطية الآن
          </button>
          <button className="btn" onClick={async () => {
            if (!confirm('تصنيف الأصناف التي بدون تصنيف تلقائياً؟')) return;
            const r = await api.autoCategorize();
            setToast(`تم تصنيف ${r.updated} صنف من أصل ${r.total} (${r.skipped} بدون تطابق)`);
          }}>
            تصنيف تلقائي للأصناف
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
        <p>مسار قاعدة البيانات: <span className="ltr">{data.backup?.dbPath}</span></p>
        <p>آخر نسخة احتياطية: {data.backup?.lastBackup || 'لا يوجد'}</p>
      </div>
    </div>
  );
}
