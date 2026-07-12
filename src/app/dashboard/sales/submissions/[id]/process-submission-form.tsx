"use client";

import { useRouter } from "next/navigation";
import { OrderSubmission } from "@/lib/order-submissions-data";
import { SalesOrderForm } from "@/components/sales/sales-order-form";
import { SiteVisitReportForm } from "../site-visit-report-form";
import { getNextPendingSubmissionIdAction } from "../actions";

export function ProcessSubmissionForm({ submission }: { submission: OrderSubmission }) {
  const router = useRouter();

  const handleSubmitted = async () => {
    const nextId = await getNextPendingSubmissionIdAction(submission.id);
    router.push(nextId ? `/dashboard/sales/submissions/${nextId}` : "/dashboard/sales/submissions");
  };

  if (submission.status === "بانتظار الكشف") {
    return <SiteVisitReportForm submissionId={submission.id} />;
  }

  if (submission.status !== "قيد المراجعة") {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-400">
        هذه الطلبية مُعالَجة بالفعل، لا يمكن إدخالها مرة أخرى من هنا.
      </div>
    );
  }

  return (
    <SalesOrderForm
      compact
      submissionId={submission.id}
      initialCustomerId={submission.matched_customer_id || undefined}
      initialNewCustomer={
        !submission.matched_customer_id && (submission.customer_name || submission.customer_phone)
          ? {
              name: submission.customer_name || "",
              phone: submission.customer_phone || "",
              address: submission.customer_address || "",
            }
          : undefined
      }
      onSubmitted={handleSubmitted}
    />
  );
}
