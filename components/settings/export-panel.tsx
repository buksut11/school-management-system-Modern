"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { downloadCsv } from "@/lib/csv";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";

const TABLES = [
  { key: "students", labelKey: "export.students" },
  { key: "teachers", labelKey: "export.teachers" },
  { key: "classes", labelKey: "export.classes" },
  { key: "attendance", labelKey: "export.attendanceLog" },
  { key: "exams", labelKey: "export.examRecords" },
  { key: "subjects", labelKey: "export.subjects" },
  { key: "departments", labelKey: "export.departments" },
  { key: "fee_payments", labelKey: "export.feePayments" },
  { key: "expenses", labelKey: "export.expenses" },
  { key: "invoices", labelKey: "export.invoices" },
  { key: "receipts", labelKey: "export.receipts" },
] as const;

export function ExportPanel({ counts }: { counts: Record<string, number> }) {
  const [loading, setLoading] = useState<string | null>(null);
  const { show } = useToast();
  const t = useT();

  async function exportTable(table: (typeof TABLES)[number]["key"]) {
    setLoading(table);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from(table).select("*");
      if (error || !data || data.length === 0) {
        show(error ? t("set.exportFailed") : t("set.nothingToExport"));
        return;
      }
      downloadCsv(`${table}.csv`, data as Record<string, string | number>[]);
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">{t("set.dataExport")}</h3>
      <p className="text-[12.5px] text-text-2 mb-4">{t("set.dataExportDesc")}</p>
      <div className="divide-y divide-line/60">
        {TABLES.map((tbl) => (
          <div key={tbl.key} className="flex items-center justify-between py-2.5">
            <div>
              <div className="text-[13.5px] font-medium">{t(tbl.labelKey as MessageKey)}</div>
              <div className="text-[11.5px] text-text-2">{t("set.records", { count: counts[tbl.key] ?? 0 })}</div>
            </div>
            <button
              onClick={() => exportTable(tbl.key)}
              disabled={loading === tbl.key}
              className="h-8 px-3 rounded-lg bg-card-2 hover:bg-hover text-[12.5px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Download size={13} /> {loading === tbl.key ? t("common.exporting") : "CSV"}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
