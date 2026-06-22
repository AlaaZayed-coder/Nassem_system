import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.jsx';

export default function ReviewInbox({ openDetail, setToast }) {
  const [rows, setRows] = useState([]);
  const load = () => api.items({ pricing_status: 'بحاجة مراجعة', pageSize: 100 }).then(d => setRows(d.rows));
  useEffect(load, []);

  async function act(fn, msg) { await fn(); setToast(msg); load(); }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 className="section-title">صندوق المراجعة</h3>
        <button className="btn" onClick={load}>تحديث</button>
      </div>
      {rows.length === 0 ? (
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>لا توجد أصناف بحاجة مراجعة حالياً.</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 70 }}>الكود</th>
              <th>الاسم</th>
              <th style={{ width: 120 }}>التصنيف</th>
              <th>سبب المراجعة</th>
              <th style={{ width: 80 }}>آخر تعديل</th>
              <th style={{ width: 150 }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(item => (
              <tr key={item.item_code} onClick={() => openDetail(item.item_code)}>
                <td className="code ltr">{item.item_code}</td>
                <td>{item.approved_name || item.original_name}</td>
                <td>{item.main_category || 'بدون تصنيف'}</td>
                <td style={{ fontSize: 11, color: '#854F0B' }}>{item.review_reason || ''}</td>
                <td style={{ fontSize: 11 }}>{item.last_modified_by || ''}</td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: 11 }}
                      onClick={() => act(() => api.approve(item.item_code), 'تم اعتماد الصنف')}>اعتماد</button>
                    <button className="btn" style={{ padding: '4px 8px', fontSize: 11 }}
                      onClick={() => {
                        const r = prompt('ملاحظة الإعادة للتعديل');
                        if (r) act(() => api.status(item.item_code, { status: 'قيد العمل', reason: r }), 'تمت الإعادة للتعديل');
                      }}>إعادة</button>
                    <button className="btn btn-purple" style={{ padding: '4px 8px', fontSize: 11 }}
                      onClick={() => act(() => api.status(item.item_code, { status: 'مؤجّل' }), 'تم التأجيل')}>تأجيل</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
