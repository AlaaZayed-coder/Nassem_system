import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function Audit() {
  const [q, setQ] = useState({});
  const [rows, setRows] = useState([]);
  const load = () => api.audit(q).then(setRows);
  useEffect(load, []);

  return (
    <div>
      <h3 className="section-title" style={{ marginBottom: 12 }}>سجل التعديلات</h3>
      <div className="toolbar">
        <input placeholder="كود الصنف" onChange={e => setQ({ ...q, item_code: e.target.value })} style={{ width: 120 }} />
        <input placeholder="المستخدم" onChange={e => setQ({ ...q, user: e.target.value })} style={{ width: 120 }} />
        <input placeholder="الإجراء" onChange={e => setQ({ ...q, action: e.target.value })} style={{ width: 120 }} />
        <button className="btn btn-primary" onClick={load}>بحث</button>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 120 }}>الوقت</th>
            <th style={{ width: 80 }}>المستخدم</th>
            <th style={{ width: 90 }}>الإجراء</th>
            <th style={{ width: 80 }}>الكود</th>
            <th style={{ width: 90 }}>الحقل</th>
            <th>القبل</th>
            <th>البعد</th>
            <th>ملاحظة</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td style={{ fontSize: 11 }}>{r.ts}</td>
              <td style={{ fontSize: 11 }}>{r.user}</td>
              <td style={{ fontSize: 11 }}>{r.action}</td>
              <td className="code ltr">{r.item_code}</td>
              <td style={{ fontSize: 11 }}>{r.field}</td>
              <td style={{ fontSize: 11 }}>{r.old_value}</td>
              <td style={{ fontSize: 11 }}>{r.new_value}</td>
              <td style={{ fontSize: 11 }}>{r.note}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 16, color: 'var(--color-text-tertiary)' }}>لا نتائج</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
