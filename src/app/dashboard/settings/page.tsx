"use client";
import { useEffect, useState } from "react";
import { getSettings, updateSetting } from "@/lib/settings-data";
import { getBomMappingDataAction } from "./bom-mapping-actions";
import { BomMappingManager } from "./bom-mapping-manager";
import { BOM_DEDUCTIBLE_KEYS } from "@/lib/bom-inventory-data";
import Link from "next/link";
import { ArrowRight, Save } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const [bomData, setBomData] = useState<{ mappings: Record<string, string>; items: any[] } | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
    getBomMappingDataAction().then(setBomData);
  }, []);

  function notify(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function save() {
    try {
      await Promise.all([
        updateSetting("default_margin_percent", settings.default_margin_percent || "0"),
        updateSetting("rounding_rule", settings.rounding_rule || "nearest_1"),
        updateSetting("currency", settings.currency || "شيكل"),
        updateSetting("sla_door_pending_days", settings.sla_door_pending_days || "3"),
        updateSetting("sla_purchase_aging_days", settings.sla_purchase_aging_days || "5"),
        updateSetting("sla_maintenance_aging_days", settings.sla_maintenance_aging_days || "2"),
        updateSetting("sla_installation_aging_days", settings.sla_installation_aging_days || "3"),
        updateSetting("sla_submission_aging_days", settings.sla_submission_aging_days || "1"),
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
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14, marginTop: 4 }}>
          <label className="field-label" style={{ fontWeight: 700 }}>مهل التنبيه بالتأخير (SLA) — أيام</label>
        </div>
        <div>
          <label className="field-label">مجرى بانتظار استكمال الباب (أيام)</label>
          <input className="field-input ltr" type="number" min="1" step="1" dir="ltr"
            value={settings.sla_door_pending_days || "3"}
            onChange={e => set("sla_door_pending_days", e.target.value)} />
        </div>
        <div>
          <label className="field-label">طلب شراء متأخر (أيام)</label>
          <input className="field-input ltr" type="number" min="1" step="1" dir="ltr"
            value={settings.sla_purchase_aging_days || "5"}
            onChange={e => set("sla_purchase_aging_days", e.target.value)} />
        </div>
        <div>
          <label className="field-label">طلب صيانة متأخر (أيام)</label>
          <input className="field-input ltr" type="number" min="1" step="1" dir="ltr"
            value={settings.sla_maintenance_aging_days || "2"}
            onChange={e => set("sla_maintenance_aging_days", e.target.value)} />
        </div>
        <div>
          <label className="field-label">تركيب متأخر بعد الإخراج (أيام)</label>
          <input className="field-input ltr" type="number" min="1" step="1" dir="ltr"
            value={settings.sla_installation_aging_days || "3"}
            onChange={e => set("sla_installation_aging_days", e.target.value)} />
        </div>
        <div>
          <label className="field-label">طلبية واردة بانتظار المعالجة (أيام)</label>
          <input className="field-input ltr" type="number" min="1" step="1" dir="ltr"
            value={settings.sla_submission_aging_days || "1"}
            onChange={e => set("sla_submission_aging_days", e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={save} style={{ alignSelf: "flex-start" }}>
          <Save size={14} /> حفظ الإعدادات
        </button>

        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14, marginTop: 4 }}>
          <label className="field-label" style={{ fontWeight: 700 }}>ربط مواد BOM بالمخزون</label>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 2, marginBottom: 10 }}>
            اربط كل بند من حاسبة استهلاك المواد بصنف حقيقي من الكتالوج ليصبح قابلاً للصرف الفعلي من المخزون عند اعتماد المهندس لحساب الباب.
          </p>
          {bomData && (
            <BomMappingManager keys={BOM_DEDUCTIBLE_KEYS} items={bomData.items} initialMappings={bomData.mappings} />
          )}
        </div>
      </div>
    </div>
  );
}
