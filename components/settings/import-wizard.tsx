"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { Upload, ArrowRight, ArrowLeft, CircleCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Label } from "@/components/ui/input";
import { bulkImportStudents, type ImportStudentRow } from "@/lib/actions/import";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";

const FIELDS: { key: keyof ImportStudentRow; labelKey: MessageKey; required?: boolean; keywords: string[] }[] = [
  { key: "full_name", labelKey: "imp.fullName", required: true, keywords: ["name"] },
  { key: "class_name", labelKey: "imp.class", keywords: ["class", "form"] },
  { key: "gender", labelKey: "imp.gender", keywords: ["gender", "sex"] },
  { key: "dob", labelKey: "imp.dob", keywords: ["dob", "birth"] },
  { key: "address", labelKey: "imp.address", keywords: ["address"] },
  { key: "mobile", labelKey: "imp.studentMobile", keywords: ["student mobile", "mobile"] },
  { key: "parent_mobile", labelKey: "imp.parentMobile", keywords: ["parent", "guardian"] },
  { key: "base_fees", labelKey: "imp.fees", keywords: ["fee"] },
];

function guessColumn(columns: string[], keywords: string[]) {
  const lower = columns.map((c) => c.toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex((c) => c.includes(kw));
    if (idx !== -1) return columns[idx];
  }
  return "";
}

export function ImportWizard() {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { show } = useToast();
  const t = useT();

  function reset() {
    setStep(1);
    setFileName("");
    setColumns([]);
    setRows([]);
    setMapping({});
    setImportedCount(null);
    setError("");
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const cols = results.meta.fields ?? [];
        if (cols.length === 0 || results.data.length === 0) {
          setError(t("imp.noRows"));
          return;
        }
        setColumns(cols);
        setRows(results.data);
        setFileName(file.name);
        const guessed: Record<string, string> = {};
        FIELDS.forEach((f) => {
          guessed[f.key] = guessColumn(cols, f.keywords);
        });
        setMapping(guessed);
        setStep(2);
      },
      error: () => setError(t("imp.parseError")),
    });
  }

  async function startImport() {
    if (!mapping.full_name) {
      setError(t("imp.mapFullName"));
      return;
    }
    setImporting(true);
    setError("");
    const mapped: ImportStudentRow[] = rows.map((row) => ({
      full_name: mapping.full_name ? row[mapping.full_name] : "",
      class_name: mapping.class_name ? row[mapping.class_name] : undefined,
      gender: mapping.gender ? row[mapping.gender] : undefined,
      dob: mapping.dob ? row[mapping.dob] : undefined,
      address: mapping.address ? row[mapping.address] : undefined,
      mobile: mapping.mobile ? row[mapping.mobile] : undefined,
      parent_mobile: mapping.parent_mobile ? row[mapping.parent_mobile] : undefined,
      base_fees: mapping.base_fees ? row[mapping.base_fees] : undefined,
    }));
    const result = await bulkImportStudents(mapped);
    setImporting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setImportedCount(result.count ?? mapped.length);
    setStep(3);
    show(t("imp.complete"));
  }

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">{t("imp.title")}</h3>
      <p className="text-[12.5px] text-text-2 mb-4">{t("imp.desc")}</p>

      {step === 1 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-2xl border border-dashed border-line bg-card-2/60 hover:bg-card-2 transition-colors py-8 flex flex-col items-center gap-2"
        >
          <Upload size={20} className="text-text-2" />
          <span className="text-[13px] font-medium">{t("imp.dropCsv")}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />

      {step === 2 && (
        <div className="space-y-4">
          <div className="text-[13px] text-text-2">
            <span className="font-medium text-text">{fileName}</span> ·{" "}
            {t("imp.recordsDetected", { rows: rows.length, cols: columns.length })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <Label htmlFor={`map-${f.key}`}>
                  {t(f.labelKey)}
                  {f.required && <span className="text-red"> *</span>}
                </Label>
                <Select
                  id={`map-${f.key}`}
                  value={mapping[f.key] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                >
                  <option value="">{t("imp.none")}</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>

          {error && <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={reset}>
              <ArrowLeft size={14} /> {t("common.cancel")}
            </Button>
            <Button onClick={startImport} disabled={importing}>
              {importing ? t("imp.importing") : t("imp.startImport")} <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <div className="w-12 h-12 rounded-full bg-green/10 text-green flex items-center justify-center">
            <CircleCheck size={24} />
          </div>
          <p className="text-[14px] font-medium">{t("imp.added", { count: importedCount ?? 0 })}</p>
          <Button variant="secondary" onClick={reset}>
            {t("imp.importAnother")}
          </Button>
        </div>
      )}
    </Card>
  );
}
