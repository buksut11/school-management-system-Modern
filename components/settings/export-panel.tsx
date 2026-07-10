"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { downloadCsv } from "@/lib/csv";
import { useToast } from "@/components/ui/toast";

const TABLES = [
  { key: "students", label: "Students" },
  { key: "teachers", label: "Teachers" },
  { key: "classes", label: "Classes" },
  { key: "attendance", label: "Attendance Log" },
  { key: "exams", label: "Exam Records" },
  { key: "subjects", label: "Subjects" },
  { key: "departments", label: "Departments" },
  { key: "fee_payments", label: "Fee Payments" },
  { key: "expenses", label: "Expenses" },
  { key: "invoices", label: "Invoices" },
  { key: "receipts", label: "Receipts" },
] as const;

export function ExportPanel({ counts }: { counts: Record<string, number> }) {
  const [loading, setLoading] = useState<string | null>(null);
  const { show } = useToast();

  async function exportTable(table: string) {
    setLoading(table);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from(table).select("*");
      if (error || !data || data.length === 0) {
        show(error ? "Export failed" : "Nothing to export yet");
        return;
      }
      downloadCsv(`${table}.csv`, data as Record<string, string | number>[]);
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">Data Export</h3>
      <p className="text-[12.5px] text-text-2 mb-4">Download a CSV snapshot of any table.</p>
      <div className="divide-y divide-line/60">
        {TABLES.map((t) => (
          <div key={t.key} className="flex items-center justify-between py-2.5">
            <div>
              <div className="text-[13.5px] font-medium">{t.label}</div>
              <div className="text-[11.5px] text-text-2">{counts[t.key] ?? 0} records</div>
            </div>
            <button
              onClick={() => exportTable(t.key)}
              disabled={loading === t.key}
              className="h-8 px-3 rounded-lg bg-card-2 hover:bg-hover text-[12.5px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Download size={13} /> {loading === t.key ? "Exporting…" : "CSV"}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
