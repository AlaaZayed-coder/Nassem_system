"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

// يُستخدم في صفحات قوائم (مشتريات/صيانة) لا تملك صفحة تفاصيل مستقلة لكل بند:
// عند الوصول عبر رابط من الأجندة ?highlight=<id>، يُمرَّر إلى الصف المطابق
// (id="row-<id>" على عنصر الصف) ويُبرَز مؤقتاً، بدل فتح قائمة عامة بلا سياق.
function HighlightScrollInner() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");

  useEffect(() => {
    if (!highlightId) return;
    // مهلة قصيرة لضمان اكتمال أي إعادة رسم أولية (React StrictMode في وضع
    // التطوير يُعيد تشغيل التأثيرات مرتين، وقد يُعيد الرسم فوق أي تعديل DOM
    // مباشر يحدث قبل الاستقرار) قبل إضافة الإبراز، ليبقى ظاهراً فعلياً.
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(`row-${highlightId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-indigo-500", "ring-offset-2");
    });
    return () => cancelAnimationFrame(raf);
  }, [highlightId]);

  return null;
}

export function HighlightScroll() {
  return (
    <Suspense fallback={null}>
      <HighlightScrollInner />
    </Suspense>
  );
}
