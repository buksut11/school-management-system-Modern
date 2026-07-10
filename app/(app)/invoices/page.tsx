import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listInvoices, listReceipts, listStudentOptions } from "@/lib/data/invoices";
import { listTeacherOptions } from "@/lib/data/teachers";
import { SetupNotice } from "@/components/setup-notice";
import { InvoicesView } from "@/components/invoices/invoices-view";

export default async function InvoicesPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="invoices" />;
  }

  const [invoices, receipts, students, teachers] = await Promise.all([
    listInvoices(),
    listReceipts(),
    listStudentOptions(),
    listTeacherOptions(),
  ]);

  return (
    <InvoicesView invoices={invoices} receipts={receipts} students={students} teachers={teachers} />
  );
}
