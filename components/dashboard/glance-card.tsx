import { Card } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";

function Row({
  label,
  value,
  count,
  total,
  color,
}: {
  label: string;
  value: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between mb-1.5 text-[13px]">
        <span className="text-text-2">{label}</span>
        <span className="font-semibold" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="h-2 rounded-full bg-card-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export async function GlanceCard({
  present,
  late,
  absent,
  total,
}: {
  present: number;
  late: number;
  absent: number;
  total: number;
}) {
  const t = await getT();
  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-4">{t("dash.glanceTitle")}</h3>
      <Row label={t("dash.present")} value={String(present)} count={present} total={total} color="var(--green)" />
      <Row label={t("dash.late")} value={String(late)} count={late} total={total} color="var(--orange)" />
      <Row label={t("dash.absent")} value={String(absent)} count={absent} total={total} color="var(--red)" />
      <div className="flex items-center justify-between pt-3 mt-1 border-t border-line text-[13px]">
        <span className="text-text-2">{t("dash.totalStudentsShort")}</span>
        <span className="font-semibold">{total}</span>
      </div>
    </Card>
  );
}
