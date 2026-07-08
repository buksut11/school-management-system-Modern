"use client";

import { useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { FeesTable } from "./fees-table";
import { FeePaymentModal } from "./fee-payment-modal";
import { downloadCsv } from "@/lib/csv";
import { formatMoney } from "@/lib/utils";
import type { FeeRow } from "@/lib/data/fees";

export function FeesView({
  rows,
  classes,
}: {
  rows: FeeRow[];
  classes: { id: string; name: string }[];
}) {
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [payTarget, setPayTarget] = useState<FeeRow | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (classFilter !== "all" && r.class_id !== classFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (query.trim() && !r.student_name.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [rows, classFilter, statusFilter, query]);

  const expected = rows.reduce((sum, r) => sum + r.due, 0);
  const collected = rows.reduce((sum, r) => sum + r.paid, 0);
  const outstanding = Math.max(0, expected - collected);
  const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

  function exportCsv() {
    downloadCsv(
      "fees.csv",
      filtered.map((r) => ({
        student: r.student_name,
        class: r.class_name ?? "",
        due: r.due,
        paid: r.paid,
        balance: r.balance,
        status: r.status,
      }))
    );
  }

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Expected" value={formatMoney(expected)} />
        <Stat label="Collected" value={formatMoney(collected)} color="var(--green)" />
        <Stat label="Outstanding" value={formatMoney(outstanding)} color="var(--red)" />
        <Stat label="Collection rate" value={`${rate}%`} />
      </div>
      <div className="h-1.5 rounded-full bg-card-2 overflow-hidden max-w-sm">
        <div className="h-full rounded-full bg-green" style={{ width: `${rate}%` }} />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented
          value={classFilter}
          onChange={setClassFilter}
          options={[{ value: "all", label: "All" }, ...classes.map((c) => ({ value: c.id, label: c.name }))]}
        />
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
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students…"
            className="pl-9"
          />
        </div>
        <Button variant="secondary" size="md" onClick={exportCsv}>
          <Download size={15} /> Export
        </Button>
      </div>

      <FeesTable rows={filtered} onPay={setPayTarget} />

      <FeePaymentModal open={!!payTarget} onClose={() => setPayTarget(null)} fee={payTarget} />
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
