"use client";

import { useRouter } from "next/navigation";
import { Segmented } from "@/components/ui/segmented";
import { AreaTrendChart } from "./area-trend-chart";
import { BarComparisonChart } from "./bar-comparison-chart";
import { formatMoney } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";
import type { AttendanceTrendPoint, FeeTrendPoint, ClassPerformancePoint, ExpenseCategoryPoint } from "@/lib/data/reports";

const CATEGORY_COLORS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5", "--chart-6"];

export function ReportsView({
  days,
  attendance,
  fees,
  classPerformance,
  expenses,
}: {
  days: number;
  attendance: AttendanceTrendPoint[];
  fees: FeeTrendPoint[];
  classPerformance: ClassPerformancePoint[];
  expenses: ExpenseCategoryPoint[];
}) {
  const router = useRouter();
  const t = useT();

  return (
    <div className="viz-root space-y-4">
      {/* Chart-mark colors, scoped locally rather than in the global
          stylesheet — custom properties that are only ever consumed via
          inline style (var(--chart-1) from a JS string, not a CSS rule)
          get pruned as "unused" by the build's CSS minifier when declared
          globally. A literal <style> tag isn't run through that pipeline,
          so it survives. Same hues as the app's badge tokens in light
          mode; dark mode gets its own steps kept within the chart
          lightness band (validated with the dataviz skill's palette
          script) rather than the brighter badge-text values. */}
      <style>{`
        .viz-root {
          --chart-1: #007aff; --chart-2: #30b0c7; --chart-3: #ff9500;
          --chart-4: #af52de; --chart-5: #34c759; --chart-6: #ff3b30;
        }
        [data-theme="dark"] .viz-root {
          --chart-1: #0a84ff; --chart-2: #1f96a8; --chart-3: #d67600;
          --chart-4: #af52de; --chart-5: #259c44; --chart-6: #ff3b30;
        }
      `}</style>
      <div className="flex items-center gap-2.5">
        <Segmented
          value={String(days)}
          onChange={(v) => router.push(`/reports?days=${v}`)}
          options={[
            { value: "7", label: t("rep.last7") },
            { value: "30", label: t("rep.last30") },
            { value: "90", label: t("rep.last90") },
          ]}
        />
      </div>

      <AreaTrendChart
        title={t("rep.attendance")}
        data={attendance}
        series={[
          { key: "present", label: t("dash.present"), color: "var(--chart-5)" },
          { key: "late", label: t("dash.late"), color: "var(--chart-3)" },
          { key: "absent", label: t("dash.absent"), color: "var(--chart-6)" },
        ]}
        annotatePeakKey="present"
      />

      <AreaTrendChart
        title={t("rep.feesCollected")}
        data={fees}
        series={[{ key: "collected", label: t("rep.collected"), color: "var(--chart-1)" }]}
        valueFormatter={(v) => formatMoney(v)}
        annotatePeakKey="collected"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarComparisonChart
          title={t("rep.avgExamByClass")}
          data={classPerformance.map((c) => ({ label: `${c.className} (${c.studentCount})`, value: c.average }))}
          emptyMessage={t("rep.noExamRecords")}
        />
        <BarComparisonChart
          title={t("rep.expensesByCategory")}
          data={expenses.map((e, i) => ({
            label: t(`expenseCat.${e.category}` as MessageKey),
            value: e.total,
            color: `var(${CATEGORY_COLORS[i % CATEGORY_COLORS.length]})`,
          }))}
          valueFormatter={(v) => formatMoney(v)}
          emptyMessage={t("rep.noExpenses")}
        />
      </div>
    </div>
  );
}
