import Link from "next/link";
import { CalendarCheck, ClipboardList, Wallet, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatMoney } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
import type { FamilyChild } from "@/lib/data/family";

const FEE_TONE = { paid: "green", partial: "orange", unpaid: "red" } as const;
const FEE_LABEL_KEY = {
  paid: "family.feesPaid",
  partial: "family.partiallyPaid",
  unpaid: "family.feesDue",
} as const;

export async function FamilyDashboard({
  children: kids,
  greetingName,
}: {
  children: FamilyChild[];
  greetingName: string;
}) {
  const t = await getT();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[19px] font-semibold tracking-tight">
          {greetingName ? t("family.welcomeName", { name: greetingName }) : t("family.welcome")}
        </h1>
        <p className="text-[13px] text-text-2">
          {kids.length === 1
            ? t("family.greeting")
            : t("family.overview", { count: kids.length })}
        </p>
      </div>

      {kids.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-[13.5px] text-text-2">{t("family.notLinked")}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {kids.map((kid) => (
          <Card key={kid.student_id} className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={kid.full_name} photoUrl={kid.photo_url} size={44} />
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold tracking-tight truncate">
                  {kid.full_name}
                </div>
                <div className="text-[12px] text-text-2">{kid.class_name ?? t("family.noClass")}</div>
              </div>
              <Badge tone={FEE_TONE[kid.fee_status]}>{t(FEE_LABEL_KEY[kid.fee_status])}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-card-2 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-2 uppercase tracking-wide">
                  <CalendarCheck size={12} /> {t("family.days30")}
                </div>
                <div className="mt-1 text-[13px] font-medium">
                  <span className="text-green">{kid.present}✓</span>{" "}
                  <span className="text-orange">{t("family.lateCount", { count: kid.late })}</span>{" "}
                  <span className="text-red">{t("family.absCount", { count: kid.absent })}</span>
                </div>
              </div>
              <div className="rounded-xl bg-card-2 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-2 uppercase tracking-wide">
                  <ClipboardList size={12} /> {kid.latest_term ?? t("family.exams")}
                </div>
                <div className="mt-1 text-[13px] font-medium">
                  {kid.latest_total !== null ? (
                    <>
                      {kid.latest_total} · {t("family.gradeLabel", { grade: kid.latest_grade ?? "" })}
                    </>
                  ) : (
                    <span className="text-text-2">{t("family.noResults")}</span>
                  )}
                </div>
              </div>
              <div className="rounded-xl bg-card-2 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-2 uppercase tracking-wide">
                  <Wallet size={12} /> {t("col.balance")}
                </div>
                <div className="mt-1 text-[13px] font-medium">
                  {kid.balance > 0 ? (
                    <span className="text-red">{formatMoney(kid.balance)}</span>
                  ) : (
                    <span className="text-green">{formatMoney(0)}</span>
                  )}
                  <span className="text-text-2 text-[11.5px]"> / {formatMoney(kid.due)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <QuickLink href="/attendance" label={t("family.attendance")} />
              <QuickLink href="/exams" label={t("family.examResults")} />
              <QuickLink href="/academic-records" label={t("family.reportCard")} />
              <QuickLink href="/fees" label={t("family.feesReceipts")} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full border border-line bg-card-2 px-3 py-1.5 text-[12.5px] font-medium text-text hover:bg-hover transition-colors"
    >
      {label} <ChevronRight size={13} className="text-text-2" />
    </Link>
  );
}
