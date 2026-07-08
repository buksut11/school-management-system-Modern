import { DatabaseZap } from "lucide-react";

export function SetupNotice({ what }: { what: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card-2 p-10 flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-orange/10 text-orange flex items-center justify-center">
        <DatabaseZap size={22} />
      </div>
      <h3 className="text-[15px] font-semibold">Connect Supabase to load {what}</h3>
      <p className="text-[13px] text-text-2 max-w-sm">
        Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code> (see{" "}
        <code>.env.local.example</code>) and run the migration in{" "}
        <code>supabase/migrations</code>, then reload.
      </p>
    </div>
  );
}
