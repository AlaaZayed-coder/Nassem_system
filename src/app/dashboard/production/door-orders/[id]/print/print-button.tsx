"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{ background: "#0f172a", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
    >
      🖨️ طباعة
    </button>
  );
}
