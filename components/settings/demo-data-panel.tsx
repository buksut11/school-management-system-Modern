"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { seedDemoData } from "@/lib/actions/demo";
import { useToast } from "@/components/ui/toast";

export function DemoDataPanel() {
  const [busy, setBusy] = useState(false);
  const { show } = useToast();

  async function load() {
    if (!confirm("Load sample teachers, students, attendance, exams, fees and expenses into the database?")) return;
    setBusy(true);
    try {
      const result = await seedDemoData();
      if ("error" in result) {
        show(result.error);
      } else {
        show(`Demo data loaded: ${result.summary}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">Demo Data</h3>
      <p className="text-[12.5px] text-text-2 mb-4">
        Fill every module with realistic sample records — teachers, students, class assignments,
        attendance, exam grades, fee payments and expenses — so you can explore the system before
        entering real data. Only available while the school has no students yet.
      </p>
      <Button onClick={load} disabled={busy} variant="secondary">
        <Sparkles size={15} /> {busy ? "Loading…" : "Load Demo Data"}
      </Button>
    </Card>
  );
}
