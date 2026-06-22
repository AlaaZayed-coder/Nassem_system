import { useEffect, useState } from 'react';
import {
  IconUserPlus, IconEdit, IconLock, IconToggleRight, IconToggleLeft,
  IconX, IconCheck, IconShield, IconUser
} from '@tabler/icons-react';
import { api } from '../api/client.js';

/* ── Permission definitions (must match server) ─────────── */
const FEATURES = [
  { key: 'items',      label: 'الأصناف والتسعير',           levels: ['none','view','edit'],  levelLabels: ['لا صلاحية','مشاهدة','تعديل'] },
  { key: 'approve',    label: 'اعتماد الأسعار وتثبيتها',    levels: ['no','yes'],            levelLabels: ['لا','نعم'] },
  { key: 'categories', label: 'التصنيفات',                   levels: ['none','view','edit'],  levelLabels: ['لا صلاحية','مشاهدة','تعديل'] },
  { key: 'audit',      label: 'سجل التعديلات',               levels: ['none','view'],         levelLabels: ['لا صلاحية','مشاهدة'] },
  { key: 'reports',    label: 'التقارير',                    levels: ['none','view'],         levelLabels: ['لا صلاحية','مشاهدة'] },
  { key: 'export',     label: 'التصدير (Excel / CSV)',        levels: ['no','yes'],            levelLabels: ['لا','نعم'] },
  { key: 'users',      label: 'إدارة المستخدمين',            levels: ['no','yes'],            levelLabels: ['لا','نعم'] },
  { key: 'settings',   label: 'الإعدادات والنسخ الاحتياطي', levels: ['no','yes'],            levelLabels: ['لا','نعم'] },
];

const DEFAULT_PERMS = {
  admin:           { items:'edit', approve:'yes', categories:'edit', audit:'view', reports:'view', export:'yes', users:'yes',  settings:'yes' },
  pricing_manager: { items:'edit', approve:'yes', categories:'view', audit:'view', reports:'view', export:'yes', users:'no',   settings:'no'  },
  viewer:          { items:'view', approve:'no',  categories:'none', audit:'none', reports:'view', export:'no',  users:'no',   settings:'no'  },
};

/* ── Permission matrix component ────────────────────────── */
function PermMatrix({ perms, onChange, disabled }) {
  return (
    <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
      {FEATURES.map((f, i) => {
        const cur = perms[f.key] || f.levels[0];
        return (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: i < FEATURES.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none', gap: 12, background: i % 2 === 0 ? 'var(--color-background-primary)' : 'var(--color-background-secondary)' }}>
            <span style={{ flex: 1, fontSize: 13 }}>{f.label}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {f.levels.map((level, li) => {
                const isActive = cur === level;
                const isLast = level === f.levels[f.levels.length - 1];
                return (
                  <button
                    key={level}
                    disabled={disabled}
                    onClick={() => !disabled && onChange(f.key, level)}
                    style={{
                      padding: '4px 12px', fontSize: 12, borderRadius: 'var(--border-radius-md)',
                      border: '0.5px solid',
                      borderColor: isActive ? (isLast ? '#1D9E75' : level === 'none' || level === 'no' ? '#DDD8CC' : '#378ADD') : 'var(--color-border-secondary)',
                      background: isActive
                        ? (level === 'none' || level === 'no' ? '#F1EFE8' : isLast ? '#EAF3DE' : '#E6F1FB')
                        : 'var(--color-background-primary)',
                      color: isActive
                        ? (level === 'none' || level === 'no' ? '#5F5E5A' : isLast ? '#27500A' : '#0C447C')
                        : 'var(--color-text-tertiary)',
                      fontWeight: isActive ? 500 : 400,
                      cursor: disabled ? 'default' : 'pointer',
                    }}
                  >
                    {f.levelLabels[li]}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Modal wrapper ──────────────────────────────────────── */
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ maxWidth: wide ? 640 : 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <b style={{ fontSize: 15 }}>{title}</b>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}><IconX size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Main screen ────────────────────────────────────────── */
export default function UsersScreen({ setToast }) {
  const [users, setUsers]     = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);

  const load = () => api.users().then(setUsers).catch(() => setUsers([]));
  useEffect(() => { load(); }, []);

  async function toggleActive(u) {
    const next = u.is_active ? 0 : 1;
    if (!confirm(next ? 'تفعيل المستخدم؟' : 'تعطيل المستخدم؟ لن يتمكن من الدخول.')) return;
    await api.updateUser(u.id, { is_active: next });
    setToast(next ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم');
    load();
  }

  const roleName = r => r === 'admin' ? 'مدير' : r === 'pricing_manager' ? 'مدير تسعير' : r;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 className="section-title">إدارة الحسابات</h3>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <IconUserPlus size={15} />إضافة مستخدم
        </button>
      </div>

      <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden', background: 'var(--color-background-primary)' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>الاسم</th>
              <th style={{ width: 100 }}>اسم الدخول</th>
              <th style={{ width: 90 }}>الحالة</th>
              <th style={{ width: 110 }}>تاريخ الإنشاء</th>
              <th style={{ width: 100 }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.45 }}>
                <td>
                  <div style={{ fontWeight: 500 }}>{u.display_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{roleName(u.role)}</div>
                </td>
                <td className="code ltr">{u.username}</td>
                <td>
                  <span style={{ fontSize: 11, borderRadius: 5, padding: '2px 8px', fontWeight: 500, background: u.is_active ? '#EAF3DE' : '#FAEEDA', color: u.is_active ? '#27500A' : '#854F0B' }}>
                    {u.is_active ? 'نشط' : 'معطّل'}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{u.created_at?.slice(0,10) || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost" style={{ padding: '4px 6px' }} title="تعديل الصلاحيات" onClick={() => setEditUser(u)}>
                      <IconEdit size={14} />
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '4px 6px' }} title="إعادة تعيين كلمة المرور" onClick={() => setResetUser(u)}>
                      <IconLock size={14} />
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '4px 6px' }} title={u.is_active ? 'تعطيل' : 'تفعيل'} onClick={() => toggleActive(u)}>
                      {u.is_active
                        ? <IconToggleRight size={18} color="#1D9E75" />
                        : <IconToggleLeft  size={18} color="#aaa" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd   && <AddUserModal    onClose={() => setShowAdd(false)} onDone={() => { load(); setShowAdd(false); }}   setToast={setToast} />}
      {editUser  && <EditUserModal   user={editUser}  onClose={() => setEditUser(null)}  onDone={() => { load(); setEditUser(null); }}  setToast={setToast} />}
      {resetUser && <ResetPwModal    user={resetUser} onClose={() => setResetUser(null)} onDone={() => setResetUser(null)}              setToast={setToast} />}
    </div>
  );
}

/* ── Add User Modal ─────────────────────────────────────── */
function AddUserModal({ onClose, onDone, setToast }) {
  const [form, setForm] = useState({ username: '', display_name: '', password: '', confirm: '', role: 'pricing_manager' });
  const [perms, setPerms] = useState({ ...DEFAULT_PERMS.pricing_manager });
  const [err, setErr]   = useState('');
  const [saving, setSaving] = useState(false);

  function setRole(role) {
    setForm(f => ({ ...f, role }));
    setPerms({ ...DEFAULT_PERMS[role] || DEFAULT_PERMS.pricing_manager });
  }

  function setPerm(key, val) { setPerms(p => ({ ...p, [key]: val })); }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!form.username.trim()) return setErr('اسم الدخول مطلوب');
    if (!form.display_name.trim()) return setErr('الاسم الظاهر مطلوب');
    if (!form.password) return setErr('كلمة المرور مطلوبة');
    if (form.password.length < 6) return setErr('كلمة المرور 6 أحرف على الأقل');
    if (form.password !== form.confirm) return setErr('كلمتا المرور غير متطابقتين');
    setSaving(true);
    try {
      await api.createUser({ username: form.username.trim(), display_name: form.display_name.trim(), password: form.password, role: form.role, permissions: perms });
      setToast('تم إضافة المستخدم بنجاح');
      onDone();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  return (
    <Modal title="إضافة مستخدم جديد" onClose={onClose} wide>
      <form onSubmit={submit}>
        {/* Basic info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label className="lbl">اسم الدخول</label>
            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.trim() }))} placeholder="مثال: khalid" className="ltr" autoFocus />
          </div>
          <div>
            <label className="lbl">الاسم الظاهر</label>
            <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="مثال: خالد" />
          </div>
          <div>
            <label className="lbl">كلمة المرور</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div>
            <label className="lbl">تأكيد كلمة المرور</label>
            <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
          </div>
        </div>

        {/* Role quick preset */}
        <div style={{ marginBottom: 12 }}>
          <label className="lbl">قالب الصلاحيات السريع</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'admin',           label: 'مدير كامل' },
              { key: 'pricing_manager', label: 'مدير تسعير' },
              { key: 'viewer',          label: 'مشاهدة فقط' },
            ].map(r => (
              <button key={r.key} type="button"
                className={`btn${form.role === r.key ? ' btn-primary' : ''}`}
                style={{ fontSize: 12 }}
                onClick={() => setRole(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--color-text-tertiary)' }}>اختر قالباً كنقطة بداية، ثم عدّل الصلاحيات بالتفصيل أدناه.</p>
        </div>

        {/* Permission matrix */}
        <div style={{ marginBottom: 14 }}>
          <label className="lbl" style={{ marginBottom: 6 }}>الصلاحيات التفصيلية</label>
          <PermMatrix perms={perms} onChange={setPerm} />
        </div>

        {err && <p className="err" style={{ marginBottom: 10 }}>{err}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            <IconCheck size={15} />{saving ? 'جاري الحفظ…' : 'إضافة المستخدم'}
          </button>
          <button className="btn" type="button" onClick={onClose}>إلغاء</button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Edit User Modal ────────────────────────────────────── */
function EditUserModal({ user, onClose, onDone, setToast }) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [perms, setPerms] = useState({ ...user.permissions });
  const [err, setErr]     = useState('');
  const [saving, setSaving] = useState(false);

  function setPerm(key, val) { setPerms(p => ({ ...p, [key]: val })); }

  async function submit(e) {
    e.preventDefault();
    if (!displayName.trim()) return setErr('الاسم مطلوب');
    setSaving(true);
    try {
      await api.updateUser(user.id, { display_name: displayName.trim(), permissions: perms });
      setToast('تم تحديث الصلاحيات');
      onDone();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  return (
    <Modal title={`تعديل صلاحيات: ${user.display_name}`} onClose={onClose} wide>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 12 }}>
          <label className="lbl">الاسم الظاهر</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </div>

        <div style={{ marginBottom: 4 }}>
          <label className="lbl" style={{ marginBottom: 6 }}>الصلاحيات التفصيلية</label>
          <PermMatrix perms={perms} onChange={setPerm} />
        </div>

        {err && <p className="err" style={{ margin: '10px 0' }}>{err}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            <IconCheck size={15} />{saving ? 'جاري الحفظ…' : 'حفظ'}
          </button>
          <button className="btn" type="button" onClick={onClose}>إلغاء</button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Reset Password Modal ───────────────────────────────── */
function ResetPwModal({ user, onClose, onDone, setToast }) {
  const [pw, setPw]   = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (pw.length < 6) return setErr('كلمة المرور 6 أحرف على الأقل');
    if (pw !== pw2)    return setErr('كلمتا المرور غير متطابقتين');
    setSaving(true);
    try {
      await api.resetPassword(user.id, pw);
      setToast('تم تغيير كلمة المرور');
      onDone();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  return (
    <Modal title={`إعادة تعيين كلمة مرور: ${user.display_name}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 10 }}>
          <label className="lbl">كلمة المرور الجديدة</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} autoFocus />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="lbl">تأكيد كلمة المرور</label>
          <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} />
        </div>
        {err && <p className="err" style={{ marginBottom: 10 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            <IconLock size={15} />{saving ? '…' : 'تغيير كلمة المرور'}
          </button>
          <button className="btn" type="button" onClick={onClose}>إلغاء</button>
        </div>
      </form>
    </Modal>
  );
}
