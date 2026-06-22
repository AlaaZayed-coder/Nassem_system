import { useState, useEffect } from 'react';
import {
  IconBuildingWarehouse, IconSearch, IconUser,
  IconLayoutDashboard, IconListDetails, IconFileDescription,
  IconCategory, IconDoor, IconReport, IconUsers, IconSettings,
  IconLogout
} from '@tabler/icons-react';
import { api } from './api/client.js';
import Dashboard from './screens/Dashboard.jsx';
import Items from './screens/Items.jsx';
import ItemDetail from './screens/ItemDetail.jsx';
import ReviewInbox from './screens/ReviewInbox.jsx';
import Categories from './screens/Categories.jsx';
import Audit from './screens/Audit.jsx';
import Reports from './screens/Reports.jsx';
import UsersScreen from './screens/Users.jsx';
import SettingsScreen from './screens/Settings.jsx';

const ALL_NAV = [
  { key: 'dashboard',  label: 'لوحة المعلومات', icon: IconLayoutDashboard, perm: null },
  { key: 'items',      label: 'الأصناف',         icon: IconListDetails,     perm: 'items' },
  null,
  { key: 'categories', label: 'التصنيفات',       icon: IconCategory,        perm: 'categories' },
  { key: 'doors',      label: 'الأبواب والتركيب', icon: IconDoor,           perm: 'items' },
  { key: 'review',     label: 'صندوق المراجعة',  icon: IconReport,          perm: 'approve' },
  { key: 'audit',      label: 'سجل التعديلات',   icon: IconFileDescription, perm: 'audit' },
  { key: 'reports',    label: 'التقارير',         icon: IconReport,          perm: 'reports' },
  null,
  { key: 'users',      label: 'المستخدمون',       icon: IconUsers,           perm: 'users' },
  { key: 'settings',   label: 'الإعدادات',        icon: IconSettings,        perm: 'settings' },
];

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
    <div className="login-wrap">
      <div className="login-card">
        <h1>نظام تسعير أصناف النسيم</h1>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 10 }}>
            <label className="field-label">اسم المستخدم</label>
            <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="field-label">كلمة المرور</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          {error && <p className="err" style={{ marginBottom: 8 }}>{error}</p>}
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>دخول</button>
        </form>
      </div>
    </div>
  );
}

function canDo(user, feature, level = 'view') {
  const p = user?.permissions;
  if (!p) return false;
  const val = p[feature];
  if (!val || val === 'none' || val === 'no') return false;
  if (level === 'view') return val === 'view' || val === 'edit' || val === 'yes';
  if (level === 'edit') return val === 'edit' || val === 'yes';
  return val !== 'none' && val !== 'no';
}

export default function App() {
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem('token');
    return t ? JSON.parse(localStorage.getItem('user') || 'null') : null;
  });
  const [page, setPage] = useState('dashboard');
  const [detailCode, setDetailCode] = useState(null);
  const [filters, setFilters] = useState({});
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function logout() { localStorage.clear(); setUser(null); }

  function openDetail(code) { setDetailCode(code); setPage('detail'); }
  function backToItems() { setPage('items'); setDetailCode(null); }

  function goPage(p, f) {
    setFilters(f || {});
    setPage(p);
    setDetailCode(null);
  }

  if (!user) return <Login onLogin={setUser} />;

  const roleName = user.role === 'admin' ? 'مدير' : user.role === 'pricing_manager' ? 'مدير تسعير' : 'مشاهد';
  const NAV = ALL_NAV.filter(item => item === null || !item.perm || canDo(user, item.perm));

  return (
    <div className="app">
      {/* ── Topbar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, order: 1 }}>
        <div className="topbar">
          <div className="topbar-brand">
            <div className="topbar-logo">
              <IconBuildingWarehouse size={17} />
            </div>
            <div className="topbar-title">
              <div className="name">النسيم إخوان</div>
              <div className="sub">إدارة وتسعير الأصناف</div>
            </div>
          </div>
          <div className="topbar-right">
            <div className="top-search" onClick={() => goPage('items', { search: '' })}>
              <IconSearch size={15} />
              <span>بحث برقم أو اسم…</span>
            </div>
            <div className="user-chip">
              <IconUser size={15} color="#0C447C" />
              <span className="uname">{user.display_name}</span>
              <span className="urole">{roleName}</span>
            </div>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={logout}>
              <IconLogout size={16} />
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="content">
          {page === 'dashboard' && <Dashboard setPage={goPage} openDetail={openDetail} setToast={setToast} />}
          {page === 'items'     && <Items initialFilters={filters} openDetail={openDetail} setToast={setToast} />}
          {page === 'detail'    && <ItemDetail code={detailCode} back={backToItems} openDetail={openDetail} setToast={setToast} />}
          {page === 'doors'     && <Items initialFilters={{ door_pricing_enabled: '1' }} openDetail={openDetail} setToast={setToast} />}
          {page === 'review'    && <ReviewInbox openDetail={openDetail} setToast={setToast} />}
          {page === 'categories' && <Categories setPage={goPage} setToast={setToast} />}
          {page === 'audit'     && <Audit />}
          {page === 'reports'   && <Reports />}
          {page === 'users'     && <UsersScreen setToast={setToast} />}
          {page === 'settings'  && <SettingsScreen setToast={setToast} />}
        </div>
      </div>

      {/* ── Sidebar ── */}
      <nav className="sidebar">
        {NAV.map((item, i) =>
          item === null
            ? <div key={i} className="nav-divider" />
            : <button
                key={item.key}
                className={`navbtn${page === item.key || (item.key === 'items' && page === 'detail') ? ' active' : ''}`}
                onClick={() => goPage(item.key)}
              >
                <item.icon size={16} />
                {item.label}
              </button>
        )}
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
