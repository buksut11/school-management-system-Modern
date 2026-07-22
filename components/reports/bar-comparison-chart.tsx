"use client";

import { useState } from "react";
import { Table2, ChartLine } from "lucide-react";
import { useT } from "@/lib/i18n/client";

export type BarDatum = { label: string; value: number; color?: string };

export function BarComparisonChart({
  title,
  data,
  color = "var(--chart-1)",
  valueFormatter = (v: number) => String(v),
  emptyMessage,
}: {
  title: string;
  data: BarDatum[];
  color?: string;
  valueFormatter?: (v: number) => string;
  emptyMessage?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const t = useT();
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14.5px] font-semibold tracking-tight">{title}</h3>
        {data.length > 0 && (
          <button
            onClick={() => setShowTable((v) => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-text transition-colors"
            aria-label={showTable ? t("rep.showChart") : t("rep.showTable")}
          >
            {showTable ? <ChartLine size={14} /> : <Table2 size={14} />}
          </button>
        )}
      </div>

      {data.length === 0 ? (
        <p className="text-[13px] text-text-2 py-6 text-center">{emptyMessage ?? t("rep.noData")}</p>
      ) : showTable ? (
        <table className="w-full text-[12.5px] border-collapse">
          <tbody className="divide-y divide-line/60">
            {data.map((d) => (
              <tr key={d.label}>
                <td className="py-1.5 pr-3 text-text-2">{d.label}</td>
                <td className="py-1.5 text-right font-medium">{valueFormatter(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="space-y-2.5">
          {data.map((d, i) => {
            const pct = Math.max(2, (d.value / max) * 100);
            const barColor = d.color ?? color;
            return (
              <div
                key={d.label}
                className="group"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                onFocus={() => setHoverIdx(i)}
                onBlur={() => setHoverIdx(null)}
                tabIndex={0}
                role="img"
                aria-label={`${d.label}: ${valueFormatter(d.value)}`}
              >
                <div className="flex items-center justify-between text-[12.5px] mb-1">
                  <span className="text-text-2 truncate">{d.label}</span>
                  <span
                    className={`font-semibold transition-opacity ${hoverIdx === i ? "opacity-100" : "opacity-90"}`}
                  >
                    {valueFormatter(d.value)}
                  </span>
                </div>
                <div className="h-[10px] rounded-full bg-card-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${pct}%`, background: barColor, opacity: hoverIdx === i ? 1 : 0.9 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
