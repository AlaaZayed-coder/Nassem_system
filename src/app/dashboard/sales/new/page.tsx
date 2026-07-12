"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SalesOrderForm } from "@/components/sales/sales-order-form";

export default function NewSalesOpportunityPage() {
  return (
    <Suspense fallback={null}>
      <NewSalesOpportunityPageInner />
    </Suspense>
  );
}

function NewSalesOpportunityPageInner() {
  const searchParams = useSearchParams();
  const submissionId = searchParams.get("submission_id");
  const customerId = searchParams.get("customer_id") || undefined;
  const newCustomerName = searchParams.get("new_customer_name");

  return (
    <SalesOrderForm
      submissionId={submissionId}
      initialCustomerId={customerId}
      initialNewCustomer={
        newCustomerName
          ? {
              name: newCustomerName,
              phone: searchParams.get("new_customer_phone") || "",
              address: searchParams.get("new_customer_address") || "",
              company: searchParams.get("new_customer_company") || "",
            }
          : undefined
      }
    />
  );
}
