import Link from "next/link";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/role-labels";
import type { Staff } from "@/lib/staff-data";

function buildTree(staff: Staff[]) {
  const byId = new Map(staff.map((s) => [s.id, s]));
  const children = new Map<string, Staff[]>();
  const roots: Staff[] = [];

  for (const s of staff) {
    // مسؤول محذوف/غير مرئي لهذا المشاهِد يُعامَل نفس معاملة "بدون مسؤول" —
    // يمنع اختفاء الموظف بالكامل من الشجرة بسبب مرجع معلّق.
    if (s.supervisor_id && byId.has(s.supervisor_id)) {
      if (!children.has(s.supervisor_id)) children.set(s.supervisor_id, []);
      children.get(s.supervisor_id)!.push(s);
    } else {
      roots.push(s);
    }
  }

  return { roots, children };
}

function TreeNode({ staff, childrenMap, depth }: { staff: Staff; childrenMap: Map<string, Staff[]>; depth: number }) {
  const reports = childrenMap.get(staff.id) || [];
  return (
    <div className={depth > 0 ? "mt-2 mr-6 border-r-2 border-slate-200 pr-4" : "mt-2"}>
      <Link
        href={`/dashboard/staff/${staff.id}/profile`}
        className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm hover:border-indigo-300 hover:shadow transition"
      >
        <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${ROLE_COLORS[staff.role] || "bg-slate-100 text-slate-800"}`}>
          {staff.name.trim().charAt(0) || "؟"}
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-bold text-slate-800">{staff.name}</span>
          <span className="text-[11px] text-slate-400">{ROLE_LABELS[staff.role] || staff.role}{reports.length > 0 ? ` · ${reports.length} تابع` : ""}</span>
        </span>
      </Link>
      {reports.length > 0 && (
        <div>
          {reports
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, "ar"))
            .map((r) => (
              <TreeNode key={r.id} staff={r} childrenMap={childrenMap} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}

export function OrgChart({ staff }: { staff: Staff[] }) {
  if (staff.length === 0) {
    return <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">لا يوجد موظفين لعرض الهيكل التنظيمي.</div>;
  }

  const { roots, children } = buildTree(staff);
  const sortedRoots = roots.slice().sort((a, b) => a.name.localeCompare(b.name, "ar"));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-x-auto">
      {sortedRoots.map((r) => (
        <TreeNode key={r.id} staff={r} childrenMap={children} depth={0} />
      ))}
    </div>
  );
}
