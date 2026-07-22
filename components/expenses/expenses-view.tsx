"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Plus, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useIsCompact } from "@/lib/use-media-query";
import { ExpensesTable } from "./expenses-table";
import { ExpensesGrid } from "./expenses-grid";
import { ExpenseModal } from "./expense-modal";
import { ExpensePaymentModal } from "./expense-payment-modal";
import { deleteExpense } from "@/lib/actions/expenses";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { downloadCsv } from "@/lib/csv";
import { formatMoney } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";
import type { ExpenseRow } from "@/lib/data/expenses";

const CATEGORIES = ["salaries", "rent", "utilities", "supplies", "maintenance", "transport"] as const;

export function ExpensesView({ expenses }: { expenses: ExpenseRow[] }) {
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const isCompact = useIsCompact();
  const activeView = isCompact ? "grid" : view;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [payTarget, setPayTarget] = useState<ExpenseRow | null>(null);
  const [, startTransition] = useTransition();
  const { show } = useToast();
  const confirm = useConfirm();
  const t = useT();

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (status !== "all" && e.status !== status) return false;
      if (query.trim() && !e.payee.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [expenses, category, status, query]);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const paidOut = expenses.reduce((sum, e) => sum + e.paid, 0);
  const outstanding = Math.max(0, total - paidOut);
  const pending = expenses.filter((e) => e.status !== "paid").length;

  async function onDelete(e: ExpenseRow) {
    const ok = await confirm({ title: t("expense.removeTitle", { name: e.payee }), confirmLabel: t("common.remove") });
    if (!ok) return;
    startTransition(async () => {
      await deleteExpense(e.id, e.payee);
      show(t("expense.removed"));
    });
  }

  function exportCsv() {
    downloadCsv(
      "expenses.csv",
      filtered.map((e) => ({
        payee: e.payee,
        category: e.category,
        date: e.date,
        amount: e.amount,
        paid: e.paid,
        balance: e.balance,
        status: e.status,
      }))
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label={t("expense.statTotal")} value={formatMoney(total)} />
        <Stat label={t("expense.statPaidOut")} value={formatMoney(paidOut)} color="var(--green)" />
        <Stat label={t("fees.statOutstanding")} value={formatMoney(outstanding)} color="var(--red)" />
        <Stat label={t("expense.statPending")} value={String(pending)} />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented
          value={category}
          onChange={setCategory}
          options={[
            { value: "all", label: t("common.all") },
            ...CATEGORIES.map((c) => ({ value: c, label: t(`expenseCat.${c}` as MessageKey) })),
          ]}
        />
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: t("common.all") },
            { value: "paid", label: t("feeStatus.paid") },
            { value: "partial", label: t("feeStatus.partial") },
            { value: "unpaid", label: t("feeStatus.unpaid") },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("expense.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        {!isCompact && <ViewToggle view={view} onChange={setView} />}
        <Button variant="secondary" size="md" onClick={exportCsv}>
          <Download size={15} /> {t("common.export")}
        </Button>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={15} /> {t("expense.add")}
        </Button>
      </div>

      {activeView === "list" ? (
        <ExpensesTable
          expenses={filtered}
          onEdit={(e) => {
            setEditing(e);
            setModalOpen(true);
          }}
          onDelete={onDelete}
          onPay={setPayTarget}
        />
      ) : (
        <ExpensesGrid
          expenses={filtered}
          onEdit={(e) => {
            setEditing(e);
            setModalOpen(true);
          }}
          onDelete={onDelete}
          onPay={setPayTarget}
        />
      )}

      <ExpenseModal open={modalOpen} onClose={() => setModalOpen(false)} expense={editing} />
      <ExpensePaymentModal open={!!payTarget} onClose={() => setPayTarget(null)} expense={payTarget} />
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
