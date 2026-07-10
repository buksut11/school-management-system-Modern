"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Plus, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { InvoicesTable } from "./invoices-table";
import { ReceiptsTable } from "./receipts-table";
import { InvoiceModal } from "./invoice-modal";
import { InvoicePaymentModal } from "./invoice-payment-modal";
import { ReceiptModal } from "./receipt-modal";
import { deleteInvoice, deleteReceipt } from "@/lib/actions/invoices";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { downloadCsv } from "@/lib/csv";
import { formatMoney } from "@/lib/utils";
import type { InvoiceRow, ReceiptRow, StudentOption } from "@/lib/data/invoices";
import type { TeacherOption } from "./party-fields";

export function InvoicesView({
  invoices,
  receipts,
  students,
  teachers,
}: {
  invoices: InvoiceRow[];
  receipts: ReceiptRow[];
  students: StudentOption[];
  teachers: TeacherOption[];
}) {
  const [tab, setTab] = useState<"invoices" | "receipts">("invoices");
  const [partyFilter, setPartyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceRow | null>(null);
  const [payTarget, setPayTarget] = useState<InvoiceRow | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [, startTransition] = useTransition();
  const { show } = useToast();
  const confirm = useConfirm();

  const q = query.trim().toLowerCase();

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (partyFilter !== "all" && inv.party_type !== partyFilter) return false;
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (q && !inv.party_name.toLowerCase().includes(q) && !inv.invoice_no.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [invoices, partyFilter, statusFilter, q]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (partyFilter !== "all" && r.party_type !== partyFilter) return false;
      if (q && !r.party_name.toLowerCase().includes(q) && !r.receipt_no.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [receipts, partyFilter, q]);

  const invoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const invoicesPaid = invoices.reduce((sum, inv) => sum + inv.paid, 0);
  const invoicesOutstanding = Math.max(0, invoiced - invoicesPaid);
  const unpaidCount = invoices.filter((inv) => inv.status !== "paid").length;

  // Receipts from students are money coming in; receipts for teachers
  // and other staff are wages going out.
  const moneyIn = receipts.filter((r) => r.party_type === "student").reduce((s, r) => s + r.amount, 0);
  const moneyOut = receipts.filter((r) => r.party_type !== "student").reduce((s, r) => s + r.amount, 0);

  async function onDeleteInvoice(inv: InvoiceRow) {
    const ok = await confirm({
      title: `Remove invoice ${inv.invoice_no}?`,
      message: `This invoice for ${inv.party_name} will be permanently removed.`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteInvoice(inv.id, inv.party_name);
      show("Invoice removed");
    });
  }

  async function onDeleteReceipt(r: ReceiptRow) {
    const ok = await confirm({
      title: `Remove receipt ${r.receipt_no}?`,
      message: `This receipt for ${r.party_name} will be permanently removed.`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteReceipt(r.id, r.party_name);
      show("Receipt removed");
    });
  }

  function exportCsv() {
    if (tab === "invoices") {
      downloadCsv(
        "invoices.csv",
        filteredInvoices.map((inv) => ({
          invoice: inv.invoice_no,
          name: inv.party_name,
          type: inv.party_type,
          detail: inv.party_detail ?? "",
          issued: inv.issued_date,
          due: inv.due_date ?? "",
          total: inv.total,
          paid: inv.paid,
          balance: inv.balance,
          status: inv.status,
        }))
      );
    } else {
      downloadCsv(
        "receipts.csv",
        filteredReceipts.map((r) => ({
          receipt: r.receipt_no,
          name: r.party_name,
          type: r.party_type,
          invoice: r.invoice_no ?? "",
          date: r.received_at.slice(0, 10),
          method: r.method,
          amount: r.amount,
          note: r.note ?? "",
        }))
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tab === "invoices" ? (
          <>
            <Stat label="Total invoiced" value={formatMoney(invoiced)} />
            <Stat label="Paid" value={formatMoney(invoicesPaid)} color="var(--green)" />
            <Stat label="Outstanding" value={formatMoney(invoicesOutstanding)} color="var(--red)" />
            <Stat label="Invoices open" value={String(unpaidCount)} />
          </>
        ) : (
          <>
            <Stat label="Receipts issued" value={String(receipts.length)} />
            <Stat label="Money in (students)" value={formatMoney(moneyIn)} color="var(--green)" />
            <Stat label="Money out (staff)" value={formatMoney(moneyOut)} color="var(--red)" />
            <Stat label="Net" value={formatMoney(moneyIn - moneyOut)} />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented
          value={tab}
          onChange={(v) => setTab(v as "invoices" | "receipts")}
          options={[
            { value: "invoices", label: "Invoices" },
            { value: "receipts", label: "Receipts" },
          ]}
        />
        <Segmented
          value={partyFilter}
          onChange={setPartyFilter}
          options={[
            { value: "all", label: "All" },
            { value: "student", label: "Students" },
            { value: "teacher", label: "Teachers" },
            { value: "staff", label: "Other staff" },
          ]}
        />
        {tab === "invoices" && (
          <Segmented
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All" },
              { value: "paid", label: "Paid" },
              { value: "partial", label: "Partial" },
              { value: "unpaid", label: "Unpaid" },
            ]}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "invoices" ? "Search invoices…" : "Search receipts…"}
            className="pl-9"
          />
        </div>
        <Button variant="secondary" size="md" onClick={exportCsv}>
          <Download size={15} /> Export
        </Button>
        {tab === "invoices" ? (
          <Button
            onClick={() => {
              setEditing(null);
              setInvoiceModalOpen(true);
            }}
          >
            <Plus size={15} /> New Invoice
          </Button>
        ) : (
          <Button onClick={() => setReceiptModalOpen(true)}>
            <Plus size={15} /> New Receipt
          </Button>
        )}
      </div>

      {tab === "invoices" ? (
        <InvoicesTable
          invoices={filteredInvoices}
          onEdit={(inv) => {
            setEditing(inv);
            setInvoiceModalOpen(true);
          }}
          onDelete={onDeleteInvoice}
          onPay={setPayTarget}
        />
      ) : (
        <ReceiptsTable receipts={filteredReceipts} onDelete={onDeleteReceipt} />
      )}

      {/* Mounted only while open so each opening starts from a fresh draft. */}
      {invoiceModalOpen && (
        <InvoiceModal
          open
          onClose={() => setInvoiceModalOpen(false)}
          invoice={editing}
          students={students}
          teachers={teachers}
        />
      )}
      <InvoicePaymentModal open={!!payTarget} onClose={() => setPayTarget(null)} invoice={payTarget} />
      {receiptModalOpen && (
        <ReceiptModal
          open
          onClose={() => setReceiptModalOpen(false)}
          students={students}
          teachers={teachers}
        />
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card className="p-3.5 text-center">
      <div className="text-[18px] font-semibold" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="text-[11.5px] text-text-2">{label}</div>
    </Card>
  );
}
