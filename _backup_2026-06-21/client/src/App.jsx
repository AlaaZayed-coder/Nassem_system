import { useEffect, useMemo, useState } from 'react';
import { api } from './api/client.js';
import { methods, money, statuses, valueFromCents } from './utils/format.js';

const nav = [
  ['dashboard', 'لوحة المعلومات'],
  ['items', 'الأصناف'],
  ['doors', 'الأبواب والتركيب'],
  ['review', 'صندوق المراجعة'],
  ['reports', 'التقارير'],
  ['categories', 'التصنيفات'],
  ['audit', 'سجل التعديلات'],
  ['users', 'المستخدمون'],
  ['settings', 'الإعدادات']
];

export default function App() {
  const [user, setUser] = useState(() => localStorage.getItem('token') ? JSON.parse(localStorage.getItem('user') || 'null') : null);
  const [page, setPage] = useState('dashboard');
  const [toast, setToast] = useState('');
  const [filters, setFilters] = useState({});

  function logout() {
    localStorage.clear();
    setUser(null);
  }

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>نظام تسعير أصناف النسيم</h1>
        {nav.map(([key, label]) => <button className={page === key ? 'active' : ''} onClick={() => setPage(key)} key={key}>{label}</button>)}
      </aside>
      <main>
        <header className="topbar">
          <div className="brand-chip"><b>النسيم إخوان</b><span>إدارة وتسعير الأصناف</span></div>
          <strong>{nav.find(n => n[0] === page)?.[1]}</strong>
          <div className="top-search">بحث برقم أو اسم…</div>
          <span>{user.display_name} · {user.role}</span>
          <button onClick={logout}>خروج</button>
        </header>
        {toast && <div className="toast">{toast}</div>}
        {page === 'dashboard' && <Dashboard setPage={setPage} setFilters={setFilters} />}
        {page === 'items' && <Items initialFilters={filters} setToast={setToast} />}
        {page === 'doors' && <Items initialFilters={{ door_pricing_enabled: '1' }} setToast={setToast} />}
        {page === 'review' && <ReviewInbox setToast={setToast} />}
        {page === 'reports' && <Reports />}
        {page === 'categories' && <Categories setToast={setToast} setPage={setPage} setFilters={setFilters} />}
        {page === 'audit' && <Audit />}
        {page === 'users' && <Users />}
        {page === 'settings' && <Settings setToast={setToast} />}
      </main>
    </div>
  );
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ username: 'ahmad', password: 'ChangeMe123!' });
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    try {
      const data = await api.login(form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) { setError(err.message); }
  }
  return (
    <div className="login">
      <form onSubmit={submit} className="panel">
        <h1>نظام تسعير أصناف النسيم</h1>
        <label>اسم المستخدم<input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></label>
        <label>كلمة المرور<input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
        {error && <p className="error">{error}</p>}
        <button className="primary">دخول</button>
      </form>
    </div>
  );
}

function Dashboard({ setPage, setFilters }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.dashboard().then(setData).catch(err => setError(err.message)); }, []);
  if (error) return <div className="panel"><p className="error">{error}</p><button onClick={() => location.reload()}>إعادة المحاولة</button></div>;
  if (!data) return <p>جاري التحميل...</p>;
  const card = (label, value, filter) => <button className="stat" onClick={() => { setFilters(filter || {}); setPage('items'); }}><span>{label}</span><b>{value || 0}</b></button>;
  return (
    <section>
      <div className="stats">
        {card('إجمالي الأصناف', data.total, {})}
        {card('معتمد', data.byStatus['معتمد'], { pricing_status: 'معتمد' })}
        {card('قيد العمل', data.byStatus['قيد العمل'], { pricing_status: 'قيد العمل' })}
        {card('بحاجة مراجعة', data.byStatus['بحاجة مراجعة'], { pricing_status: 'بحاجة مراجعة' })}
        {card('غير مسعّر', data.byStatus['غير مسعّر'], { pricing_status: 'غير مسعّر' })}
        {card('مؤجّل', data.byStatus['مؤجّل'], { pricing_status: 'مؤجّل' })}
      </div>
      <div className="progress"><span style={{ width: `${data.progress}%` }} /> <b>{data.progress}% نسبة الإنجاز</b></div>
      <div className="toolbar">
        <button className="primary" onClick={async () => { const n = await api.next(); setFilters({ open: n.item_code }); setPage('items'); }}>ابدأ من هنا</button>
        {['غير مسعّر', 'بحاجة مراجعة', 'قيد العمل'].map(s => <button key={s} onClick={() => { setFilters({ pricing_status: s }); setPage('items'); }}>{s}</button>)}
        <button onClick={() => { setFilters({ main_category: '' }); setPage('items'); }}>بدون تصنيف</button>
        <button onClick={() => { setFilters({ needs_cleaning: '1' }); setPage('items'); }}>يحتاج تنظيف</button>
        <button onClick={() => { setFilters({ door_pricing_enabled: '1' }); setPage('items'); }}>الأبواب والتركيب</button>
      </div>
      <p>تم تعديل {data.modifiedToday} صنف اليوم، وتم اعتماد {data.approvedToday} صنف. متوسط الاعتماد اليومي: {data.averageDailyApproved || 'غير متاح بعد'}، الأيام المتوقعة: {data.estimatedRemainingDays || 'غير متاح بعد'}.</p>
      <table><thead><tr><th>التصنيف</th><th>الإجمالي</th><th>معتمد</th><th>قيد العمل</th><th>بحاجة مراجعة</th><th>غير مسعّر</th><th>مؤجّل</th><th>نسبة الإنجاز</th></tr></thead>
        <tbody>{data.categories.map(r => <tr key={r.category} onClick={() => { setFilters({ main_category: r.category === 'بدون تصنيف' ? '' : r.category }); setPage('items'); }}><td>{r.category}</td><td>{r.total}</td><td>{r.approved}</td><td>{r.working}</td><td>{r.review}</td><td>{r.unpriced}</td><td>{r.postponed}</td><td>{r.total ? Math.round(r.approved / r.total * 100) : 0}%</td></tr>)}</tbody></table>
    </section>
  );
}

function Items({ initialFilters = {}, reviewOnly = false, setToast }) {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pageSize: 50 });
  const [selected, setSelected] = useState([]);
  const [current, setCurrent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [importPreview, setImportPreview] = useState(null);
  const load = () => api.items({ ...filters, page: filters.page || 1 }).then(setData);
  useEffect(() => { setFilters(initialFilters); }, [JSON.stringify(initialFilters)]);
  useEffect(() => { load(); api.categories().then(setCategories); if (initialFilters.open) api.item(initialFilters.open).then(setCurrent); }, [JSON.stringify(filters)]);
  const mainCategories = categories.filter(c => c.type === 'main' && c.is_active);
  const currentCategory = filters.main_category || (filters.no_category === '1' ? 'بدون تصنيف' : '');
  const units = [...new Set(data.rows.map(item => item.unit || item.original_unit).filter(Boolean))].sort();
  async function exportNow(format = 'xlsx') {
    const result = await api.exportFile({ filters, format });
    window.open(result.file, '_blank');
    setToast('تم إنشاء ملف التصدير');
  }
  async function previewFile(file) {
    const form = new FormData();
    form.append('file', file);
    setImportPreview(await api.previewImport(form));
  }
  return (
    <section>
      <div className="category-context">
        <div>
          <span>الفئة الحالية</span>
          <b>{currentCategory || 'كل الفئات'}</b>
        </div>
        <div className="category-context-actions">
          {currentCategory && <button onClick={() => setFilters({ ...filters, main_category: '', no_category: '', page: 1 })}>عرض كل الفئات</button>}
          <button className="primary" onClick={async () => { const n = await api.next({ main_category: filters.main_category || '' }); if (n.item_code) api.item(n.item_code).then(setCurrent); }}>الصنف التالي في هذه الفئة</button>
        </div>
      </div>
      <div className="toolbar filters">
        <input placeholder="بحث بالكود أو الاسم" value={filters.search || ''} onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })} />
        <select value={filters.pricing_status || ''} onChange={e => setFilters({ ...filters, pricing_status: e.target.value })}><option value="">كل الحالات</option>{statuses.map(s => <option key={s}>{s}</option>)}</select>
        <select value={filters.main_category || ''} onChange={e => setFilters({ ...filters, main_category: e.target.value })}><option value="">كل التصنيفات</option>{mainCategories.map(c => <option key={c.id}>{c.name}</option>)}</select>
        <select value={filters.unit || ''} onChange={e => setFilters({ ...filters, unit: e.target.value, page: 1 })}><option value="">كل الوحدات</option>{units.map(unit => <option key={unit}>{unit}</option>)}</select>
        <select value={filters.pricing_method || ''} onChange={e => setFilters({ ...filters, pricing_method: e.target.value, page: 1 })}><option value="">كل أنواع التسعير</option>{methods.map(m => <option key={m}>{m}</option>)}</select>
        <select value={filters.door_pricing_enabled || ''} onChange={e => setFilters({ ...filters, door_pricing_enabled: e.target.value })}><option value="">الأبواب: الكل</option><option value="1">نعم</option><option value="0">لا</option></select>
        <select value={filters.sort || 'code'} onChange={e => setFilters({ ...filters, sort: e.target.value, page: 1 })}>
          <option value="code">ترتيب حسب الكود</option>
          <option value="name">ترتيب حسب الاسم</option>
          <option value="status">ترتيب حسب الحالة</option>
          <option value="modified">آخر تعديل أولاً</option>
          <option value="price">السعر الأعلى أولاً</option>
        </select>
        <label className="check-filter"><input type="checkbox" checked={filters.missing_cost === '1'} onChange={e => setFilters({ ...filters, missing_cost: e.target.checked ? '1' : '', page: 1 })} /> بدون تكلفة</label>
        <label className="check-filter"><input type="checkbox" checked={filters.missing_final_price === '1'} onChange={e => setFilters({ ...filters, missing_final_price: e.target.checked ? '1' : '', page: 1 })} /> بدون سعر نهائي</label>
        <button onClick={() => exportNow('xlsx')}>تصدير Excel</button>
        <button onClick={() => exportNow('csv')}>تصدير CSV</button>
        {!reviewOnly && <label className="file">استيراد CSV<input type="file" accept=".csv" onChange={e => previewFile(e.target.files[0])} /></label>}
      </div>
      {importPreview && <div className="panel">
        <b>معاينة الاستيراد</b>
        <p>الصفوف: {importPreview.totalRows} · جديد: {importPreview.newItems} · موجود: {importPreview.existingItems} · يحتاج تنظيف: {importPreview.garbage} · تعارضات: {importPreview.conflicts}</p>
        <button className="primary" onClick={async () => { await api.confirmImport(importPreview.filePath); setImportPreview(null); load(); setToast('تم الاستيراد بنجاح'); }}>تأكيد الاستيراد</button>
      </div>}
      {selected.length > 0 && <BulkBar selected={selected} categories={mainCategories} after={load} setToast={setToast} />}
      <table><thead><tr><th></th><th>الكود</th><th>الاسم الأصلي</th><th>الاسم المعتمد</th><th>الوحدة</th><th>التصنيف</th><th>نوع التسعير</th><th>التكلفة</th><th>السعر النهائي</th><th>بدون تركيب</th><th>مع تركيب</th><th>حالة التسعير</th><th>مثبّت؟</th><th>آخر تعديل</th></tr></thead>
        <tbody>{data.rows.map(item => <tr key={item.item_code} onClick={() => api.item(item.item_code).then(setCurrent)}>
          <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.includes(item.item_code)} onChange={e => setSelected(e.target.checked ? [...selected, item.item_code] : selected.filter(x => x !== item.item_code))} /></td>
          <td className="ltr">{item.item_code}</td><td>{item.original_name}</td><td>{item.approved_name}</td><td>{item.unit || item.original_unit}</td><td>{item.main_category}</td><td>{item.pricing_method}</td><td className="ltr">{money(item.cost_price_cents)}</td><td className="ltr">{money(item.final_selling_price_cents)}</td><td className="ltr">{money(item.price_without_installation_cents)}</td><td className="ltr">{money(item.price_with_installation_cents)}</td><td><Status s={item.pricing_status} /></td><td>{item.price_locked ? 'نعم' : 'لا'}</td><td>{item.last_modified_by || ''}</td>
        </tr>)}</tbody></table>
      <div className="pager"><button disabled={data.page <= 1} onClick={() => setFilters({ ...filters, page: data.page - 1 })}>السابق</button><span>{data.page} / {Math.ceil(data.total / data.pageSize) || 1}</span><button disabled={data.page * data.pageSize >= data.total} onClick={() => setFilters({ ...filters, page: data.page + 1 })}>التالي</button></div>
      {current && <ItemModal item={current} categories={mainCategories} close={() => { setCurrent(null); load(); }} setToast={setToast} />}
    </section>
  );
}

function BulkBar({ selected, categories, after, setToast }) {
  const [patch, setPatch] = useState({});
  async function apply() {
    if (!confirm(`تطبيق التعديل على ${selected.length} صنف؟`)) return;
    await api.bulk({ codes: selected, patch });
    setToast('تم تنفيذ التعديل الجماعي');
    after();
  }
  async function lockSelected() {
    if (!confirm(`تثبيت ${selected.length} صنف؟`)) return;
    await api.bulkLock(selected);
    setToast('تم تثبيت الأصناف المحددة');
    after();
  }
  async function unlockSelected() {
    const reason = prompt('سبب فك التثبيت الجماعي');
    if (!reason) return;
    await api.bulkUnlock(selected, reason);
    setToast('تم فك تثبيت الأصناف المحددة');
    after();
  }
  return <div className="bulk"><span>{selected.length} محدد</span><select onChange={e => setPatch({ ...patch, main_category: e.target.value })}><option>تصنيف رئيسي</option>{categories.map(c => <option key={c.id}>{c.name}</option>)}</select><input placeholder="هامش الربح %" onChange={e => setPatch({ ...patch, profit_margin_percent: e.target.value })} /><select onChange={e => setPatch({ ...patch, pricing_status: e.target.value })}><option>الحالة</option>{statuses.map(s => <option key={s}>{s}</option>)}</select><button onClick={apply}>تطبيق</button><button onClick={lockSelected}>تثبيت جماعي</button><button onClick={unlockSelected}>فك جماعي</button></div>;
}

function ReviewInbox({ setToast }) {
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pageSize: 50 });
  const [current, setCurrent] = useState(null);
  const [categories, setCategories] = useState([]);
  const load = () => api.items({ pricing_status: 'بحاجة مراجعة', pageSize: 100 }).then(setData);
  useEffect(() => { load(); api.categories().then(rows => setCategories(rows.filter(c => c.type === 'main' && c.is_active))); }, []);
  async function action(fn, message) {
    await fn();
    setToast(message);
    load();
  }
  return (
    <section>
      <div className="toolbar"><button onClick={load}>تحديث</button></div>
      <table><thead><tr><th>الكود</th><th>الاسم</th><th>التصنيف</th><th>سبب المراجعة</th><th>آخر ملاحظة</th><th>آخر تعديل بواسطة</th><th>آخر تعديل</th><th>إجراءات</th></tr></thead>
        <tbody>{data.rows.map(item => <tr key={item.item_code}>
          <td className="ltr" onClick={() => api.item(item.item_code).then(setCurrent)}>{item.item_code}</td>
          <td onClick={() => api.item(item.item_code).then(setCurrent)}>{item.approved_name || item.original_name}</td>
          <td>{item.main_category || 'بدون تصنيف'}</td>
          <td>{item.review_reason || ''}</td>
          <td>{item.notes || ''}</td>
          <td>{item.last_modified_by || ''}</td>
          <td>{item.last_modified_at || ''}</td>
          <td className="row-actions">
            <button onClick={() => action(() => api.approve(item.item_code), 'تم اعتماد الصنف')}>اعتماد</button>
            <button onClick={() => {
              const reason = prompt('ملاحظة الإعادة للتعديل');
              if (reason) return action(() => api.status(item.item_code, { status: 'قيد العمل', reason }), 'تمت الإعادة للتعديل');
            }}>إعادة للتعديل</button>
            <button onClick={() => action(() => api.status(item.item_code, { status: 'مؤجّل' }), 'تم التأجيل')}>تأجيل</button>
          </td>
        </tr>)}</tbody></table>
      {data.rows.length === 0 && <p className="panel">لا توجد أصناف بحاجة مراجعة حالياً.</p>}
      {current && <ItemModal item={current} categories={categories} close={() => { setCurrent(null); load(); }} setToast={setToast} />}
    </section>
  );
}

function ItemModal({ item, categories, close, setToast }) {
  const [form, setForm] = useState(() => ({
    ...item,
    cost_price: valueFromCents(item.cost_price_cents),
    final_selling_price: valueFromCents(item.final_selling_price_cents),
    price_per_m2: valueFromCents(item.price_per_m2_cents),
    price_without_installation: valueFromCents(item.price_without_installation_cents),
    installation_fee: valueFromCents(item.installation_fee_cents),
    price_with_installation: valueFromCents(item.price_with_installation_cents)
  }));
  const locked = Number(form.price_locked) === 1;
  const set = (k, v) => setForm({ ...form, [k]: v });
  async function save(next = false) {
    const saved = await api.saveItem(item.item_code, form);
    setToast('تم الحفظ');
    if (next) {
      const n = await api.next({ main_category: saved.main_category || '' });
      n.item_code ? setForm(await api.item(n.item_code)) : close();
    } else close();
  }
  async function act(fn, msg) { await fn(); setToast(msg); close(); }
  return (
    <div className="modal"><div className="sheet">
      <button className="close" onClick={close}>×</button>
      <h2>{item.original_name} <span className="ltr">{item.item_code}</span></h2>
      {locked && <p className="lock">السعر مثبّت. فك التثبيت مطلوب لتعديل حقول التسعير.</p>}
      <div className="grid">
        <fieldset><legend>معلومات أصلية</legend><label>الكود<input className="ltr" value={item.item_code} readOnly /></label><label>الاسم الأصلي<input value={item.original_name} readOnly /></label><label>الوحدة الأصلية<input value={item.original_unit || ''} readOnly /></label></fieldset>
        <fieldset><legend>التصنيف والاسم</legend><label>اسم مقترح<input value={form.proposed_name || ''} onChange={e => set('proposed_name', e.target.value)} /></label><label>اسم معتمد<input value={form.approved_name || ''} onChange={e => set('approved_name', e.target.value)} /></label><label>حالة الاسم<input value={form.name_status || ''} onChange={e => set('name_status', e.target.value)} /></label><label>تصنيف رئيسي<select value={form.main_category || ''} onChange={e => set('main_category', e.target.value)}><option></option>{categories.map(c => <option key={c.id}>{c.name}</option>)}</select></label><label>تصنيف فرعي<input value={form.sub_category || ''} onChange={e => set('sub_category', e.target.value)} /></label><label>وحدة<input value={form.unit || ''} onChange={e => set('unit', e.target.value)} /></label><label>نوع التسعير<select value={form.pricing_method || ''} onChange={e => set('pricing_method', e.target.value)}>{methods.map(m => <option key={m}>{m}</option>)}</select></label></fieldset>
        <fieldset><legend>التكلفة والربح</legend><label>سعر التكلفة<input disabled={locked} className="ltr" type="number" value={form.cost_price || ''} onChange={e => set('cost_price', e.target.value)} /></label><label>مصدر التكلفة<input disabled={locked} value={form.cost_source || ''} onChange={e => set('cost_source', e.target.value)} /></label><label>المورد<input disabled={locked} value={form.supplier || ''} onChange={e => set('supplier', e.target.value)} /></label><label>تاريخ التكلفة<input disabled={locked} type="date" value={form.cost_date || ''} onChange={e => set('cost_date', e.target.value)} /></label><label>هامش الربح %<input disabled={locked} className="ltr" type="number" value={form.profit_margin_percent || ''} onChange={e => set('profit_margin_percent', e.target.value)} /></label><label>السعر المقترح<input readOnly className="ltr" value={money(form.suggested_selling_price_cents)} /></label><label>السعر النهائي<input disabled={locked} className="ltr" type="number" value={form.final_selling_price || ''} onChange={e => set('final_selling_price', e.target.value)} /></label>{Number(form.final_selling_price) < Number(form.cost_price) && <p className="warning">السعر النهائي أقل من التكلفة</p>}</fieldset>
        <fieldset><legend>الأبواب والتركيب</legend><label><input type="checkbox" checked={!!form.door_pricing_enabled} onChange={e => set('door_pricing_enabled', e.target.checked ? 1 : 0)} /> يحتاج تسعير باب</label>{!!form.door_pricing_enabled && <><label>نوع الوحدة<select disabled={locked} value={form.door_unit_type || ''} onChange={e => set('door_unit_type', e.target.value)}><option></option><option>قطعة</option><option>متر مربع</option><option>يدوي</option></select></label><label>العرض<input disabled={locked} type="number" value={form.width || ''} onChange={e => set('width', e.target.value)} /></label><label>الارتفاع<input disabled={locked} type="number" value={form.height || ''} onChange={e => set('height', e.target.value)} /></label><label>سعر المتر<input disabled={locked} type="number" value={form.price_per_m2 || ''} onChange={e => set('price_per_m2', e.target.value)} /></label><label>بدون تركيب<input disabled={locked} type="number" value={form.price_without_installation || ''} onChange={e => set('price_without_installation', e.target.value)} /></label><label>نوع التركيب<select disabled={locked} value={form.installation_type || ''} onChange={e => set('installation_type', e.target.value)}><option></option><option>ثابت</option><option>لكل متر مربع</option></select></label><label>أجرة التركيب<input disabled={locked} type="number" value={form.installation_fee || ''} onChange={e => set('installation_fee', e.target.value)} /></label><label>مع التركيب<input disabled={locked && !form.manual_price_override} type="number" value={form.price_with_installation || ''} onChange={e => set('price_with_installation', e.target.value)} /></label><label><input type="checkbox" checked={!!form.manual_price_override} onChange={e => set('manual_price_override', e.target.checked ? 1 : 0)} /> تعديل يدوي للسعر</label><textarea placeholder="ملاحظات التركيب" value={form.installation_notes || ''} onChange={e => set('installation_notes', e.target.value)} /></>}</fieldset>
        <fieldset><legend>الحالة والملاحظات</legend><label>الحالة<select value={form.pricing_status || ''} onChange={e => set('pricing_status', e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><label>سبب المراجعة<textarea value={form.review_reason || ''} onChange={e => set('review_reason', e.target.value)} /></label><label>ملاحظات<textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></label><p>آخر تعديل: {form.last_modified_by || ''} {form.last_modified_at || ''}</p></fieldset>
      </div>
      <div className="actions"><button onClick={() => save(false)}>حفظ مسودة</button><button onClick={() => save(true)}>حفظ والتالي</button><button className="primary" onClick={() => act(() => api.approve(item.item_code), 'تم الاعتماد والتثبيت')}>اعتماد التسعير</button><button onClick={() => act(() => api.status(item.item_code, { status: 'بحاجة مراجعة', reason: prompt('سبب المراجعة') }), 'تم تحويله للمراجعة')}>بحاجة مراجعة</button><button onClick={() => confirm('تأجيل الصنف؟') && act(() => api.status(item.item_code, { status: 'مؤجّل' }), 'تم التأجيل')}>تأجيل</button>{locked && <button onClick={() => act(() => api.unlock(item.item_code, prompt('سبب فك التثبيت')), 'تم فك التثبيت')}>فك التثبيت</button>}</div>
    </div></div>
  );
}

const statusColors = {
  'معتمد': ['#EAF3DE', '#27500A'],
  'قيد العمل': ['#E6F1FB', '#0C447C'],
  'بحاجة مراجعة': ['#FAEEDA', '#633806'],
  'غير مسعّر': ['#F1EFE8', '#444441'],
  'مؤجّل': ['#EEEDFE', '#3C3489']
};
function Status({ s }) {
  const [background, color] = statusColors[s] || ['#FCEBEB', '#791F1F'];
  return <span className="status" style={{ background, color }}>{s}</span>;
}

function Categories({ setToast, setPage, setFilters }) {
  const [rows, setRows] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'main' });
  const load = () => Promise.all([api.categories(), api.dashboard()]).then(([cats, dash]) => { setRows(cats); setDashboard(dash); });
  useEffect(load, []);
  async function add() { await api.addCategory(form); setToast('تمت إضافة التصنيف'); setForm({ name: '', type: 'main' }); load(); }
  const categoryStats = Object.fromEntries((dashboard?.categories || []).map(row => [row.category, row]));
  const openCategory = (name) => {
    setFilters(name === 'بدون تصنيف' ? { no_category: '1', sort: 'code' } : { main_category: name, sort: 'code' });
    setPage('items');
  };
  return <section>
    <div className="section-head">
      <div>
        <h2>الفئات</h2>
        <p>اضغط على أي فئة لعرض منتجاتها، ثم افتح المنتج لإدخال السعر أو تغيير فئته.</p>
      </div>
      <button onClick={() => openCategory('بدون تصنيف')}>منتجات بدون تصنيف</button>
    </div>
    <div className="category-grid">
      {rows.filter(r => r.type === 'main' && r.is_active).map(category => {
        const stat = categoryStats[category.name] || { total: 0, approved: 0, working: 0, review: 0, unpriced: 0, postponed: 0 };
        const progress = stat.total ? Math.round((stat.approved || 0) / stat.total * 100) : 0;
        return <button className="category-card" key={category.id} onClick={() => openCategory(category.name)}>
          <span>{category.name}</span>
          <b>{stat.total || 0}</b>
          <small>معتمد {stat.approved || 0} · غير مسعّر {stat.unpriced || 0} · مراجعة {stat.review || 0}</small>
          <i><em style={{ width: `${progress}%` }} /></i>
        </button>;
      })}
    </div>
    <div className="panel category-admin">
      <h3>إدارة الفئات</h3>
      <div className="toolbar"><input placeholder="اسم التصنيف" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="main">رئيسي</option><option value="sub">فرعي</option></select><button onClick={add}>إضافة</button></div>
      <table><tbody>{rows.map(r => <tr key={r.id}><td>{r.name}</td><td>{r.type === 'main' ? 'رئيسي' : 'فرعي'}</td><td>{r.is_active ? 'نشط' : 'معطل'}</td><td><button onClick={async () => { await api.updateCategory(r.id, { is_active: r.is_active ? 0 : 1 }); load(); }}>تبديل الحالة</button></td></tr>)}</tbody></table>
    </div>
  </section>;
}

function Audit() {
  const [q, setQ] = useState({});
  const [rows, setRows] = useState([]);
  const load = () => api.audit(q).then(setRows);
  useEffect(load, []);
  return <section><div className="toolbar"><input placeholder="كود الصنف" onChange={e => setQ({ ...q, item_code: e.target.value })} /><input placeholder="المستخدم" onChange={e => setQ({ ...q, user: e.target.value })} /><input placeholder="الإجراء" onChange={e => setQ({ ...q, action: e.target.value })} /><button onClick={load}>بحث</button></div><table><thead><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>الكود</th><th>الحقل</th><th>قبل</th><th>بعد</th><th>ملاحظة</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td>{r.ts}</td><td>{r.user}</td><td>{r.action}</td><td className="ltr">{r.item_code}</td><td>{r.field}</td><td>{r.old_value}</td><td>{r.new_value}</td><td>{r.note}</td></tr>)}</tbody></table></section>;
}

function Reports() {
  const [r, setR] = useState(null);
  useEffect(() => { api.reports().then(setR); }, []);
  if (!r) return <p>جاري التحميل...</p>;
  return <section><div className="stats">{Object.entries({ 'تم تعديلها اليوم': r.daily.modifiedToday, 'تم اعتمادها اليوم': r.daily.approvedToday, 'بحاجة مراجعة اليوم': r.daily.reviewToday, 'أسماء تغيرت اليوم': r.daily.namesChangedToday }).map(([k, v]) => <div className="stat" key={k}><span>{k}</span><b>{v}</b></div>)}</div><h3>العمل المتبقي</h3><div className="stats">{Object.entries(r.remaining).map(([k, v]) => <div className="stat" key={k}><span>{k}</span><b>{v}</b></div>)}</div><h3>آخر الأصناف المعدلة</h3><table><tbody>{r.daily.latest.map(x => <tr key={x.item_code}><td className="ltr">{x.item_code}</td><td>{x.original_name}</td><td>{x.pricing_status}</td><td>{x.last_modified_by}</td><td>{x.last_modified_at}</td></tr>)}</tbody></table></section>;
}

function Users() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.users().then(setRows).catch(() => setRows([])); }, []);
  return <section><p>إدارة المستخدمين الكاملة للمدير. كلمة المرور المؤقتة موجودة في README.</p><table><tbody>{rows.map(u => <tr key={u.id}><td>{u.display_name}</td><td className="ltr">{u.username}</td><td>{u.role}</td><td>{u.is_active ? 'نشط' : 'معطل'}</td></tr>)}</tbody></table></section>;
}

function Settings({ setToast }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.settings().then(setData); }, []);
  if (!data) return null;
  return <section className="panel"><label>العملة<input value="شيكل" readOnly /></label><label>هامش افتراضي %<input value={data.settings.default_margin_percent || 0} onChange={e => setData({ ...data, settings: { ...data.settings, default_margin_percent: e.target.value } })} /></label><label>قاعدة التقريب<select value={data.settings.rounding_rule || 'nearest_1'} onChange={e => setData({ ...data, settings: { ...data.settings, rounding_rule: e.target.value } })}><option value="nearest_1">أقرب شيكل</option></select></label><label>الأسعار شاملة ضريبة؟<select value={data.settings.tax_inclusive || 'false'} onChange={e => setData({ ...data, settings: { ...data.settings, tax_inclusive: e.target.value } })}><option value="false">لا</option><option value="true">نعم - إعداد مستقبلي فقط</option></select></label><label>نسبة الضريبة %<input value={data.settings.vat_percent || 0} onChange={e => setData({ ...data, settings: { ...data.settings, vat_percent: e.target.value } })} /></label><p className="warning">لا يتم احتساب الضريبة في نسخة MVP. هذه الحقول محفوظة للتحضير المستقبلي فقط.</p><p>مسار قاعدة البيانات: <span className="ltr">{data.backup.dbPath}</span></p><p>آخر نسخة احتياطية: {data.backup.lastBackup || 'لا يوجد'}</p><button onClick={async () => { await api.saveSettings(data.settings); setToast('تم حفظ الإعدادات'); }}>حفظ</button><button onClick={async () => { await api.backup(); setToast('تم إنشاء نسخة احتياطية'); }}>نسخة احتياطية الآن</button></section>;
}
