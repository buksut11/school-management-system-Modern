import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listExpenses } from "@/lib/data/expenses";
import { SetupNotice } from "@/components/setup-notice";
import { ExpensesView } from "@/components/expenses/expenses-view";

export default async function ExpensesPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="expenses" />;
  }

  const expenses = await listExpenses();

  return <ExpensesView expenses={expenses} />;
}
