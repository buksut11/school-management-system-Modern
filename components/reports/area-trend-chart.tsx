"use client";

import { useMemo, useState } from "react";
import { Table2, ChartLine } from "lucide-react";
import { formatDate } from "@/lib/utils";

export type Series = { key: string; label: string; color: string };

export function AreaTrendChart({
  title,
  data,
  series,
  valueFormatter = (v: number) => String(v),
  annotatePeakKey,
}: {
  title: string;
  data: Array<Record<string, number | string>>;
  series: Series[];
  valueFormatter?: (v: number) => string;
  /** Series key to call out with a direct "Peak <value> · <date>" label —
   * kept to one annotation so it can't collide with the others (see the
   * end-label collision note further down). */
  annotatePeakKey?: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const width = 720;
  const height = 220;
  const padL = 36;
  const padR = 12;
  const padT = 28;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxValue = useMemo(() => {
    const max = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)));
    // round up to a clean step so gridlines land on nice numbers
    const step = max <= 10 ? 2 : max <= 50 ? 10 : max <= 200 ? 25 : 50;
    return Math.ceil(max / step) * step || step;
  }, [data, series]);

  const x = (i: number) => padL + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => padT + plotH - (v / maxValue) * plotH;

  const paths = series.map((s) => {
    const pts = data.map((d, i) => [x(i), y(Number(d[s.key]) || 0)] as const);
    const line = pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
    const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${padT + plotH} L${pts[0][0].toFixed(1)},${padT + plotH} Z`;
    return { key: s.key, line, area, last: pts[pts.length - 1] };
  });

  const peak = useMemo(() => {
    if (!annotatePeakKey || data.length < 2) return null;
    let bestIdx = 0;
    let bestVal = -Infinity;
    data.forEach((d, i) => {
      const v = Number(d[annotatePeakKey]) || 0;
      if (v > bestVal) {
        bestVal = v;
        bestIdx = i;
      }
    });
    // The endpoint already carries its own label for single-series charts —
    // skip a second, redundant annotation if the peak IS the endpoint.
    if (bestIdx === data.length - 1) return null;
    return { idx: bestIdx, value: bestVal };
  }, [data, annotatePeakKey]);

  const gridSteps = 4;
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));
  const rowTotal = (row: Record<string, number | string>) =>
    series.reduce((sum, s) => sum + (Number(row[s.key]) || 0), 0);

  return (
    <div className="rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[14.5px] font-semibold tracking-tight">{title}</h3>
        <button
          onClick={() => setShowTable((v) => !v)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-text transition-colors"
          aria-label={showTable ? "Show chart" : "Show table"}
        >
          {showTable ? <ChartLine size={14} /> : <Table2 size={14} />}
        </button>
      </div>

      {series.length > 1 && (
        <div className="flex items-center gap-4 mb-3">
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 text-[12px] text-text-2">
              <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </div>
          ))}
        </div>
      )}

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px] border-collapse">
            <thead>
              <tr className="text-text-2 text-left">
                <th className="py-1.5 pr-3 font-medium">Date</th>
                {series.map((s) => (
                  <th key={s.key} className="py-1.5 pr-3 font-medium text-right">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {data.map((d, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-3 text-text-2">{formatDate(String(d.date))}</td>
                  {series.map((s) => (
                    <td key={s.key} className="py-1.5 pr-3 text-right font-medium">
                      {valueFormatter(Number(d[s.key]) || 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto touch-none"
            role="img"
            aria-label={title}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = ((e.clientX - rect.left) / rect.width) * width;
              const i = Math.round(((relX - padL) / plotW) * (data.length - 1));
              setHoverIdx(Math.min(data.length - 1, Math.max(0, i)));
            }}
            onMouseLeave={() => setHoverIdx(null)}
          >
            {Array.from({ length: gridSteps + 1 }).map((_, i) => {
              const v = (maxValue / gridSteps) * i;
              return (
                <g key={i}>
                  <line
                    x1={padL}
                    x2={width - padR}
                    y1={y(v)}
                    y2={y(v)}
                    stroke="var(--border)"
                    strokeWidth={1}
                  />
                  <text x={padL - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-text-2" fontSize={10}>
                    {v}
                  </text>
                </g>
              );
            })}

            {data.map((d, i) =>
              i % labelEvery === 0 ? (
                <text
                  key={i}
                  x={x(i)}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-text-2"
                  fontSize={10}
                >
                  {formatDate(String(d.date)).replace(/,.*/, "")}
                </text>
              ) : null
            )}

            {paths.map((p, idx) => (
              <path key={p.key} d={p.area} fill={series[idx].color} opacity={0.1} stroke="none" />
            ))}
            {paths.map((p, idx) => (
              <path
                key={p.key}
                d={p.line}
                fill="none"
                stroke={series[idx].color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}

            {peak && (() => {
              const s = series.find((s) => s.key === annotatePeakKey)!;
              const px = x(peak.idx);
              const py = y(peak.value);
              const labelAbove = py > padT + 14;
              return (
                <g>
                  <line x1={px} x2={px} y1={labelAbove ? py - 8 : py + 8} y2={py} stroke={s.color} strokeWidth={1} opacity={0.5} />
                  <circle cx={px} cy={py} r={3.5} fill={s.color} stroke="var(--solid)" strokeWidth={1.5} />
                  <text
                    x={Math.min(width - padR - 2, Math.max(padL + 2, px))}
                    y={labelAbove ? py - 12 : py + 20}
                    textAnchor={px > width - 80 ? "end" : "middle"}
                    fontSize={10}
                    fontWeight={600}
                    className="fill-text"
                  >
                    Peak {valueFormatter(peak.value)} · {formatDate(String(data[peak.idx].date)).replace(/,.*/, "")}
                  </text>
                </g>
              );
            })()}

            {paths.map((p, idx) => (
              <g key={p.key}>
                <circle cx={p.last[0]} cy={p.last[1]} r={4} fill={series[idx].color} stroke="var(--solid)" strokeWidth={2} />
                {/* Direct end-value labels only when there's a single line —
                    with 3 close-valued series (e.g. Late/Absent) the labels
                    collide and become noise. Legend + hover tooltip + table
                    view already carry every value for the multi-series case. */}
                {series.length === 1 && (
                  <text
                    x={Math.min(width - padR - 4, p.last[0] + 6)}
                    y={p.last[1] - 6}
                    fontSize={10}
                    fontWeight={600}
                    className="fill-text"
                    textAnchor="start"
                  >
                    {valueFormatter(Number(data[data.length - 1][series[idx].key]) || 0)}
                  </text>
                )}
              </g>
            ))}

            {hoverIdx !== null && (
              <g>
                <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={padT} y2={padT + plotH} stroke="var(--border)" strokeWidth={1} />
                {series.map((s) => (
                  <g key={s.key}>
                    {/* Tasteful hover glow — a soft, low-opacity halo behind
                        the point, not a loud effect that competes with the
                        data (see marks-and-anatomy.md on saturated blocks). */}
                    <circle
                      cx={x(hoverIdx)}
                      cy={y(Number(data[hoverIdx][s.key]) || 0)}
                      r={9}
                      fill={s.color}
                      opacity={0.18}
                    />
                    <circle
                      cx={x(hoverIdx)}
                      cy={y(Number(data[hoverIdx][s.key]) || 0)}
                      r={4}
                      fill={s.color}
                      stroke="var(--solid)"
                      strokeWidth={2}
                    />
                  </g>
                ))}
              </g>
            )}
          </svg>

          {hoverIdx !== null && (
            <div
              className="absolute top-2 pointer-events-none rounded-lg bg-solid border border-line shadow-card px-3 py-2 text-[12px]"
              style={{
                left: `${Math.min(85, Math.max(2, (x(hoverIdx) / width) * 100))}%`,
                transform: "translateX(-50%)",
              }}
            >
              <div className="text-text-2 mb-1">{formatDate(String(data[hoverIdx].date))}</div>
              {series.map((s) => {
                const value = Number(data[hoverIdx][s.key]) || 0;
                const total = rowTotal(data[hoverIdx]);
                const pct = series.length > 1 && total > 0 ? Math.round((value / total) * 100) : null;
                return (
                  <div key={s.key} className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-0.5 rounded-full" style={{ background: s.color }} />
                    <span className="font-semibold">{valueFormatter(value)}</span>
                    <span className="text-text-2">
                      {s.label}
                      {pct !== null && ` (${pct}%)`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
