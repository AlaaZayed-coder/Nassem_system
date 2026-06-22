import { useEffect, useState } from 'react';
import { IconPlayerPlay, IconBolt, IconCalendar } from '@tabler/icons-react';
import { api } from '../api/client.js';

const KPI_STYLES = {
  'إجمالي':        { bg: '#F1EFE8', label: '#5F5E5A', value: '#2C2C2A' },
  'معتمد':         { bg: '#EAF3DE', label: '#3B6D11', value: '#173404' },
  'قيد العمل':     { bg: '#E6F1FB', label: '#185FA5', value: '#042C53' },
  'بحاجة مراجعة':  { bg: '#FAEEDA', label: '#854F0B', value: '#412402' },
  'غير مسعّر':     { bg: '#F1EFE8', label: '#5F5E5A', value: '#2C2C2A' },
  'مؤجّل':         { bg: '#EEEDFE', label: '#534AB7', value: '#26215C' },
};

const CAT_COLORS = ['#1D9E75','#378ADD','#378ADD','#EF9F27','#EF9F27','#378ADD','#888780'];

export default function Dashboard({ setPage, openDetail, setToast }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then(setData).catch(e => setError(e.message));
  }, []);

  async function startHere() {
    try {
      const n = await api.next({});
      if (n?.item_code) openDetail(n.item_code);
      else setToast('لا توجد أصناف غير مسعّرة');
    } catch { setToast('تعذّر فتح الصنف التالي'); }
  }

  if (error) return (
    <div style={{ padding: 16 }}>
      <p className="err">{error}</p>
      <button className="btn" onClick={() => window.location.reload()}>إعادة المحاولة</button>
    </div>
  );
  if (!data) return <p style={{ padding: 16, color: 'var(--color-text-tertiary)' }}>جاري التحميل…</p>;

  const byStatus = data.byStatus || {};
  const kpis = [
    { label: 'إجمالي',        value: data.total,                   filter: {} },
    { label: 'معتمد',         value: byStatus['معتمد'],             filter: { pricing_status: 'معتمد' } },
    { label: 'قيد العمل',     value: byStatus['قيد العمل'],         filter: { pricing_status: 'قيد العمل' } },
    { label: 'بحاجة مراجعة',  value: byStatus['بحاجة مراجعة'],      filter: { pricing_status: 'بحاجة مراجعة' } },
    { label: 'غير مسعّر',     value: byStatus['غير مسعّر'],         filter: { pricing_status: 'غير مسعّر' } },
    { label: 'مؤجّل',         value: byStatus['مؤجّل'],             filter: { pricing_status: 'مؤجّل' } },
  ];

  const cats = data.categories || [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 className="section-title">لوحة معلومات التسعير</h3>
        <button className="btn btn-primary" onClick={startHere}>
          <IconPlayerPlay size={15} />
          ابدأ من هنا
        </button>
      </div>

      {/* KPI cards */}
      <div className="kpi-grid">
        {kpis.map(k => {
          const s = KPI_STYLES[k.label] || KPI_STYLES['إجمالي'];
          return (
            <div key={k.label} className="kpi" style={{ background: s.bg }}
              onClick={() => setPage('items', k.filter)}>
              <div className="kpi-label" style={{ color: s.label }}>{k.label}</div>
              <div className="kpi-value" style={{ color: s.value }}>{(k.value || 0).toLocaleString('en')}</div>
            </div>
          );
        })}
      </div>

      {/* Progress */}
      <div className="progress-wrap">
        <div className="progress-header">
          <span style={{ color: 'var(--color-text-secondary)' }}>نسبة الإنجاز العامة</span>
          <span style={{ fontWeight: 500 }}>{data.progress || 0}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${data.progress || 0}%` }} />
        </div>
        <div className="progress-footer">
          <span><IconBolt size={13} style={{ verticalAlign: -2 }} /> اليوم: {data.modifiedToday || 0} صنف</span>
          {data.estimatedRemainingDays && (
            <span><IconCalendar size={13} style={{ verticalAlign: -2 }} /> الانتهاء المتوقع: ~{data.estimatedRemainingDays} يوم عمل</span>
          )}
        </div>
      </div>

      {/* Category rows */}
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
        التقدّم حسب التصنيف{' '}
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 11 }}>(اضغط أي صفّ لفتح أصنافه)</span>
      </div>
      <div>
        {cats.map((r, i) => {
          const pct = r.total ? Math.round((r.approved || 0) / r.total * 100) : 0;
          const col = CAT_COLORS[i % CAT_COLORS.length];
          return (
            <div key={r.category} className="cat-row"
              onClick={() => setPage('items', r.category === 'بدون تصنيف' ? { no_category: '1' } : { main_category: r.category })}>
              <div className="cat-name">{r.category}</div>
              <div className="cat-bar-wrap">
                <div className="cat-bar-fill" style={{ width: `${pct}%`, background: col }} />
              </div>
              <div className="cat-pct">{pct}%</div>
              <div className="cat-count">{r.approved}/{r.total}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
