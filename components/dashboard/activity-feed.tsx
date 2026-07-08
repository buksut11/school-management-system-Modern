import { Card } from "@/components/ui/card";
import { UserPlus, GraduationCap, CalendarCheck, Info } from "lucide-react";

const ICONS: Record<string, typeof UserPlus> = {
  student: UserPlus,
  teacher: GraduationCap,
  attendance: CalendarCheck,
};

export function ActivityFeed({
  items,
}: {
  items: { id: number; message: string; kind: string; time: string }[];
}) {
  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">Recent Activity</h3>
      {items.length === 0 ? (
        <p className="text-[13px] text-text-2 py-6 text-center">
          Nothing yet — activity will show up here as you use the app.
        </p>
      ) : (
        <div className="divide-y divide-line/50 -mx-1">
          {items.map((item) => {
            const Icon = ICONS[item.kind] ?? Info;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-1 py-3 hover:bg-hover/50 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-soft text-blue flex items-center justify-center flex-none">
                  <Icon size={15} />
                </div>
                <p className="flex-1 text-[13px] text-text truncate">{item.message}</p>
                <span className="text-[11.5px] text-text-2 flex-none">{item.time}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
