import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  listInvoices,
  listReceipts,
  getInvoiceSummary,
  getReceiptSummary,
  listStudentOptions,
  listTeacherContactOptions,
} from "@/lib/data/invoices";
import { SetupNotice } from "@/components/setup-notice";
import { InvoicesView } from "@/components/invoices/invoices-view";

export default async function InvoicesPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="invoices" />;
  }

  const [invoices, receipts, invoiceSummary, receiptSummary, students, teachers] = await Promise.all([
    listInvoices(),
    listReceipts(),
    getInvoiceSummary(),
    getReceiptSummary(),
    listStudentOptions(),
    listTeacherContactOptions(),
  ]);

  return (
    <InvoicesView
      initialInvoices={invoices}
      initialReceipts={receipts}
      invoiceSummary={invoiceSummary}
      receiptSummary={receiptSummary}
      students={students}
      teachers={teachers}
    />
  );
}
