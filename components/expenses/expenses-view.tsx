"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Plus, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { ViewToggle } from "@/components/ui/view-toggle";
import { ExpensesTable } from "./expenses-table";
import { ExpensesGrid } from "./expenses-grid";
import { ExpenseModal } from "./expense-modal";
import { ExpensePaymentModal } from "./expense-payment-modal";
import { deleteExpense } from "@/lib/actions/expenses";
import { useToast } from "@/components/ui/toast";
import { downloadCsv } from "@/lib/csv";
import { formatMoney } from "@/lib/utils";
import type { ExpenseRow } from "@/lib/data/expenses";

const CATEGORIES = ["salaries", "rent", "utilities", "supplies", "maintenance", "transport"] as const;

export function ExpensesView({ expenses }: { expenses: ExpenseRow[] }) {
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [payTarget, setPayTarget] = useState<ExpenseRow | null>(null);
  const [, startTransition] = useTransition();
  const { show } = useToast();

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

  function onDelete(e: ExpenseRow) {
    if (!confirm(`Remove the ${e.payee} expense?`)) return;
    startTransition(async () => {
      await deleteExpense(e.id, e.payee);
      show("Expense removed");
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
    <div className="space-y-4 max-w-6xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total expenses" value={formatMoney(total)} />
        <Stat label="Paid out" value={formatMoney(paidOut)} color="var(--green)" />
        <Stat label="Outstanding" value={formatMoney(outstanding)} color="var(--red)" />
        <Stat label="Bills pending" value={String(pending)} />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented
          value={category}
          onChange={setCategory}
          options={[
            { value: "all", label: "All" },
            ...CATEGORIES.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) })),
          ]}
        />
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All" },
            { value: "paid", label: "Paid" },
            { value: "partial", label: "Partial" },
            { value: "unpaid", label: "Unpaid" },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search payees…"
            className="pl-9"
          />
        </div>
        <ViewToggle view={view} onChange={setView} />
        <Button variant="secondary" size="md" onClick={exportCsv}>
          <Download size={15} /> Export
        </Button>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={15} /> Add Expense
        </Button>
      </div>

      {view === "list" ? (
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
