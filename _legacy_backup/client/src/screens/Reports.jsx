import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function Reports() {
  const [r, setR] = useState(null);
  useEffect(() => { api.reports().then(setR); }, []);
  if (!r) return <p style={{ color: 'var(--color-text-tertiary)' }}>جاري التحميل…</p>;

  const daily = r.daily || {};
  const remaining = r.remaining || {};

  return (
    <div>
      <h3 className="section-title" style={{ marginBottom: 12 }}>التقارير</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 16 }}>
        {[
          ['تم تعديلها اليوم', daily.modifiedToday],
          ['تم اعتمادها اليوم', daily.approvedToday],
          ['بحاجة مراجعة اليوم', daily.reviewToday],
        ].map(([label, value]) => (
          <div key={label} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{value || 0}</div>
          </div>
        ))}
      </div>

      <b style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>العمل المتبقي</b>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 16 }}>
        {Object.entries(remaining).map(([k, v]) => (
          <div key={k} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{k}</div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{v}</div>
          </div>
        ))}
      </div>

      {daily.latest?.length > 0 && (
        <>
          <b style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>آخر الأصناف المعدلة</b>
          <table className="tbl">
            <thead><tr><th>الكود</th><th>الاسم</th><th>الحالة</th><th>المستخدم</th><th>التاريخ</th></tr></thead>
            <tbody>
              {daily.latest.map(x => (
                <tr key={x.item_code}>
                  <td className="code ltr">{x.item_code}</td>
                  <td>{x.original_name}</td>
                  <td style={{ fontSize: 11 }}>{x.pricing_status}</td>
                  <td style={{ fontSize: 11 }}>{x.last_modified_by}</td>
                  <td style={{ fontSize: 11 }}>{x.last_modified_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
