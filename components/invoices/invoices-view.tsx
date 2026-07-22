"use client";

import { useState, useTransition } from "react";
import { Search, Plus, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { usePagedList } from "@/lib/use-paged-list";
import { INVOICES_PAGE_SIZE, RECEIPTS_PAGE_SIZE } from "@/lib/pagination";
import { InvoicesTable } from "./invoices-table";
import { ReceiptsTable } from "./receipts-table";
import { InvoiceModal } from "./invoice-modal";
import { InvoicePaymentModal } from "./invoice-payment-modal";
import { ReceiptModal } from "./receipt-modal";
import {
  deleteInvoice,
  deleteReceipt,
  searchInvoices,
  searchReceipts,
} from "@/lib/actions/invoices";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { downloadCsv } from "@/lib/csv";
import { formatMoney } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type {
  InvoiceRow,
  InvoicesPage,
  InvoiceSummary,
  ReceiptRow,
  ReceiptsPage,
  ReceiptSummary,
} from "@/lib/data/invoices";
import type { StudentOption } from "@/lib/data/invoices";
import type { TeacherOption } from "./party-fields";

export function InvoicesView({
  initialInvoices,
  initialReceipts,
  invoiceSummary,
  receiptSummary,
  students,
  teachers,
}: {
  initialInvoices: InvoicesPage;
  initialReceipts: ReceiptsPage;
  invoiceSummary: InvoiceSummary;
  receiptSummary: ReceiptSummary;
  students: StudentOption[];
  teachers: TeacherOption[];
}) {
  const [tab, setTab] = useState<"invoices" | "receipts">("invoices");
  const [partyFilter, setPartyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const invoices = usePagedList<InvoiceRow>({
    initial: initialInvoices,
    fetchPage: searchInvoices,
    pageSize: INVOICES_PAGE_SIZE,
    filters: { partyType: partyFilter, status: statusFilter },
  });
  const receipts = usePagedList<ReceiptRow>({
    initial: initialReceipts,
    fetchPage: searchReceipts,
    pageSize: RECEIPTS_PAGE_SIZE,
    filters: { partyType: partyFilter },
  });

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceRow | null>(null);
  const [payTarget, setPayTarget] = useState<InvoiceRow | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [exporting, startExport] = useTransition();
  const { show } = useToast();
  const confirm = useConfirm();
  const t = useT();

  // A payment creates a receipt and changes an invoice's balance, so any
  // finance mutation refreshes both lists (the summary cards refresh from
  // the server via revalidatePath in the action).
  function refreshAll() {
    invoices.refresh();
    receipts.refresh();
  }

  async function onDeleteInvoice(inv: InvoiceRow) {
    const ok = await confirm({
      title: t("invoice.removeInvoiceTitle", { no: inv.invoice_no }),
      message: t("invoice.removeInvoiceMsg", { name: inv.party_name }),
      confirmLabel: t("common.remove"),
    });
    if (!ok) return;
    try {
      await deleteInvoice(inv.id, inv.party_name);
      show(t("invoice.invoiceRemoved"));
      refreshAll();
    } catch (e) {
      show(e instanceof Error ? e.message : t("invoice.couldNotRemoveInvoice"));
    }
  }

  async function onDeleteReceipt(r: ReceiptRow) {
    const ok = await confirm({
      title: t("invoice.removeReceiptTitle", { no: r.receipt_no }),
      message: t("invoice.removeReceiptMsg", { name: r.party_name }),
      confirmLabel: t("common.remove"),
    });
    if (!ok) return;
    try {
      await deleteReceipt(r.id, r.party_name);
      show(t("invoice.receiptRemoved"));
      refreshAll();
    } catch (e) {
      show(e instanceof Error ? e.message : t("invoice.couldNotRemoveReceipt"));
    }
  }

  // Export covers every row matching the current search + filters, pulled
  // from the server rather than only the rows loaded on screen.
  function exportCsv() {
    startExport(async () => {
      if (tab === "invoices") {
        const all = await searchInvoices({
          search: invoices.query.trim(),
          offset: 0,
          limit: 100000,
          partyType: partyFilter,
          status: statusFilter,
        });
        downloadCsv(
          "invoices.csv",
          all.rows.map((inv) => ({
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
        const all = await searchReceipts({
          search: receipts.query.trim(),
          offset: 0,
          limit: 100000,
          partyType: partyFilter,
        });
        downloadCsv(
          "receipts.csv",
          all.rows.map((r) => ({
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
    });
  }

  const active = tab === "invoices" ? invoices : receipts;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tab === "invoices" ? (
          <>
            <Stat label={t("invoice.statTotalInvoiced")} value={formatMoney(invoiceSummary.invoiced)} />
            <Stat label={t("invoice.statPaid")} value={formatMoney(invoiceSummary.paid)} color="var(--green)" />
            <Stat label={t("invoice.statOutstanding")} value={formatMoney(invoiceSummary.outstanding)} color="var(--red)" />
            <Stat label={t("invoice.statOpen")} value={String(invoiceSummary.openCount)} />
          </>
        ) : (
          <>
            <Stat label={t("invoice.statReceipts")} value={String(receiptSummary.count)} />
            <Stat label={t("invoice.statMoneyIn")} value={formatMoney(receiptSummary.moneyIn)} color="var(--green)" />
            <Stat label={t("invoice.statMoneyOut")} value={formatMoney(receiptSummary.moneyOut)} color="var(--red)" />
            <Stat label={t("invoice.statNet")} value={formatMoney(receiptSummary.moneyIn - receiptSummary.moneyOut)} />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented
          value={tab}
          onChange={(v) => setTab(v as "invoices" | "receipts")}
          options={[
            { value: "invoices", label: t("invoice.tabInvoices") },
            { value: "receipts", label: t("invoice.tabReceipts") },
          ]}
        />
        <Segmented
          value={partyFilter}
          onChange={setPartyFilter}
          options={[
            { value: "all", label: t("common.all") },
            { value: "student", label: t("nav.students") },
            { value: "teacher", label: t("nav.teachers") },
            { value: "staff", label: t("party.otherStaff") },
          ]}
        />
        {tab === "invoices" && (
          <Segmented
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: t("common.all") },
              { value: "paid", label: t("feeStatus.paid") },
              { value: "partial", label: t("feeStatus.partial") },
              { value: "unpaid", label: t("feeStatus.unpaid") },
            ]}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2" />
          <Input
            value={active.query}
            onChange={(e) => active.setQuery(e.target.value)}
            placeholder={tab === "invoices" ? t("invoice.searchInvoices") : t("invoice.searchReceipts")}
            className="pl-9"
          />
        </div>
        <Button variant="secondary" size="md" onClick={exportCsv} disabled={exporting}>
          <Download size={15} /> {exporting ? t("common.exporting") : t("common.export")}
        </Button>
        {tab === "invoices" ? (
          <Button
            onClick={() => {
              setEditing(null);
              setInvoiceModalOpen(true);
            }}
          >
            <Plus size={15} /> {t("invoice.newInvoiceBtn")}
          </Button>
        ) : (
          <Button onClick={() => setReceiptModalOpen(true)}>
            <Plus size={15} /> {t("invoice.newReceiptBtn")}
          </Button>
        )}
      </div>

      {tab === "invoices" ? (
        <InvoicesTable
          invoices={invoices.rows}
          onEdit={(inv) => {
            setEditing(inv);
            setInvoiceModalOpen(true);
          }}
          onDelete={onDeleteInvoice}
          onPay={setPayTarget}
        />
      ) : (
        <ReceiptsTable receipts={receipts.rows} onDelete={onDeleteReceipt} />
      )}

      {active.rows.length === 0 && active.query.trim() && !active.pending && (
        <p className="text-center text-[13px] text-text-2 py-6">
          {tab === "invoices"
            ? t("invoice.noInvoices", { query: active.query.trim() })
            : t("invoice.noReceipts", { query: active.query.trim() })}
        </p>
      )}

      {active.hasMore && (
        <div className="flex justify-center pt-1">
          <Button variant="secondary" size="md" onClick={active.loadMore} disabled={active.pending}>
            {active.pending ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}

      {/* Mounted only while open so each opening starts from a fresh draft. */}
      {invoiceModalOpen && (
        <InvoiceModal
          open
          onClose={() => setInvoiceModalOpen(false)}
          onSaved={refreshAll}
          invoice={editing}
          students={students}
          teachers={teachers}
        />
      )}
      <InvoicePaymentModal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        onSaved={refreshAll}
        invoice={payTarget}
      />
      {receiptModalOpen && (
        <ReceiptModal
          open
          onClose={() => setReceiptModalOpen(false)}
          onSaved={refreshAll}
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
