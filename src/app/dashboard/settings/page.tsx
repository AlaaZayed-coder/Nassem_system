"use client";
import { useEffect, useState } from "react";
import { getSettings, updateSetting } from "@/lib/settings-data";
import Link from "next/link";
import { ArrowRight, Save } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");

  useEffect(() => { getSettings().then(setSettings); }, []);

  function notify(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function save() {
    try {
      await Promise.all([
        updateSetting("default_margin_percent", settings.default_margin_percent || "0"),
        updateSetting("rounding_rule", settings.rounding_rule || "nearest_1"),
        updateSetting("currency", settings.currency || "شيكل"),
      ]);
      notify("تم حفظ الإعدادات ✓");
    } catch (e: any) { notify(e.message); }
  }

  function set(k: string, v: string) { setSettings(s => ({ ...s, [k]: v })); }

  return (
    <div className="legacy-wrapper" dir="rtl">
      {toast && <div className="toast">{toast}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Link href="/" className="btn"><ArrowRight size={14} /></Link>
        <h3 className="section-title" style={{ margin: 0 }}>الإعدادات</h3>
      </div>

      <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label className="field-label">العملة</label>
          <input className="field-input" value={settings.currency || ""} onChange={e => set("currency", e.target.value)} />
        </div>
        <div>
          <label className="field-label">هامش الربح الافتراضي %</label>
          <input className="field-input ltr" type="number" step="0.1" dir="ltr"
            value={settings.default_margin_percent || "0"}
            onChange={e => set("default_margin_percent", e.target.value)} />
        </div>
        <div>
          <label className="field-label">قاعدة التقريب</label>
          <select className="field-input" value={settings.rounding_rule || "nearest_1"}
            onChange={e => set("rounding_rule", e.target.value)}>
            <option value="nearest_1">أقرب شيكل</option>
            <option value="nearest_5">أقرب 5 شيكل</option>
            <option value="nearest_10">أقرب 10 شيكل</option>
            <option value="none">بدون تقريب</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={save} style={{ alignSelf: "flex-start" }}>
          <Save size={14} /> حفظ الإعدادات
        </button>
      </div>
    </div>
  );
}
