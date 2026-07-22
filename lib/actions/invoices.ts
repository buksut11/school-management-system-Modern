"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import { getT } from "@/lib/i18n/server";
import { logActivity } from "@/lib/activity";
import {
  listInvoices,
  listReceipts,
  type InvoicesPage,
  type ReceiptsPage,
} from "@/lib/data/invoices";
import type { FormState } from "@/lib/actions/students";
import type { InvoiceItem, PartyType, PaymentMethod } from "@/lib/types/database";

const PARTY_TYPES: PartyType[] = ["student", "teacher", "staff"];

// Client-callable pagination/search for the two finance lists.
export async function searchInvoices(opts: {
  search: string;
  offset: number;
  limit?: number;
  partyType?: string;
  status?: string;
}): Promise<InvoicesPage> {
  return listInvoices(opts);
}

export async function searchReceipts(opts: {
  search: string;
  offset: number;
  limit?: number;
  partyType?: string;
}): Promise<ReceiptsPage> {
  return listReceipts(opts);
}

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

type ParsedParty = {
  party_type: PartyType;
  party_id: string | null;
  party_name: string;
  party_detail: string | null;
  party_phone: string | null;
  party_address: string | null;
  parent_name: string | null;
  parent_phone: string | null;
};

async function parseParty(formData: FormData): Promise<{ error: string } | ParsedParty> {
  const partyType = str(formData, "party_type") as PartyType | null;
  if (!partyType || !PARTY_TYPES.includes(partyType)) return { error: (await getT())("err.pickWhoFor") };
  const partyName = str(formData, "party_name");
  if (!partyName) {
    return {
      error:
        partyType === "staff" ? "Enter the staff member's name." : "Pick a person from the list.",
    };
  }
  return {
    party_type: partyType,
    party_id: str(formData, "party_id"),
    party_name: partyName,
    party_detail: str(formData, "party_detail"),
    party_phone: str(formData, "party_phone"),
    party_address: str(formData, "party_address"),
    // Parent/guardian details only make sense for students.
    parent_name: partyType === "student" ? str(formData, "parent_name") : null,
    parent_phone: partyType === "student" ? str(formData, "parent_phone") : null,
  };
}

function parseItems(raw: string | null): InvoiceItem[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const items = parsed
      .map((it) => {
        const o = it as Record<string, unknown>;
        return {
          description: typeof o.description === "string" ? o.description.trim() : "",
          qty: Number(o.qty),
          unit_price: Number(o.unit_price),
        };
      })
      .filter((it) => it.description && Number.isFinite(it.qty) && Number.isFinite(it.unit_price));
    return items.every((it) => it.qty > 0 && it.unit_price >= 0) ? items : null;
  } catch {
    return null;
  }
}

export async function saveInvoice(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = str(formData, "id");
  const party = await parseParty(formData);
  if ("error" in party) return party;

  const items = parseItems(str(formData, "items"));
  if (!items || items.length === 0) {
    return { error: (await getT())("err.addLineItem") };
  }
  const total = Math.round(items.reduce((sum, it) => sum + it.qty * it.unit_price, 0) * 100) / 100;

  const supabase = await createClient();
  const record = {
    ...party,
    items,
    total,
    issued_date: str(formData, "issued_date") ?? new Date().toISOString().slice(0, 10),
    due_date: str(formData, "due_date"),
    note: str(formData, "note"),
  };

  const query = id
    ? supabase.from("invoices").update(record).eq("id", id)
    : supabase.from("invoices").insert(record);
  const { error } = await query;
  if (error) return { error: friendlyError(error) };

  await logActivity(
    supabase,
    "invoice",
    `${id ? "Updated" : "New"} invoice · ${party.party_name} · $${total}`
  );
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteInvoice(id: string, partyName: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw new Error(friendlyError(error));
  await logActivity(supabase, "invoice", `Removed invoice · ${partyName}`);
  revalidatePath("/", "layout");
}

export async function recordInvoicePayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const invoiceId = str(formData, "invoice_id");
  const amount = Number(str(formData, "amount") ?? 0);
  const t = await getT();
  if (!invoiceId) return { error: t("err.missingInvoice") };
  if (!(amount > 0)) return { error: t("err.amountPositive") };

  const supabase = await createClient();
  // Payment + snapshot receipt happen atomically in the database
  // (migration 0030): a per-invoice lock and a balance check against the
  // receipts ledger stop concurrent submissions from overpaying the
  // invoice — the function raises a readable message instead.
  const { data, error } = await supabase.rpc("record_invoice_payment", {
    p_invoice_id: invoiceId,
    p_amount: amount,
    p_method: (str(formData, "method") ?? "cash") as PaymentMethod,
    p_note: str(formData, "note"),
  });
  if (error) return { error: friendlyError(error) };

  await logActivity(
    supabase,
    "receipt",
    `Invoice payment · ${data?.party_name ?? "party"} · $${amount}`
  );
  revalidatePath("/", "layout");
  return { success: true };
}

export async function saveReceipt(_prev: FormState, formData: FormData): Promise<FormState> {
  const party = await parseParty(formData);
  if ("error" in party) return party;

  const amount = Number(str(formData, "amount") ?? 0);
  if (!(amount > 0)) return { error: (await getT())("err.amountPositive") };

  const supabase = await createClient();
  const receivedDate = str(formData, "received_date");
  const { error } = await supabase.from("receipts").insert({
    ...party,
    amount,
    method: (str(formData, "method") ?? "cash") as PaymentMethod,
    note: str(formData, "note"),
    ...(receivedDate ? { received_at: new Date(`${receivedDate}T12:00:00`).toISOString() } : {}),
  });
  if (error) return { error: friendlyError(error) };

  await logActivity(supabase, "receipt", `Receipt issued · ${party.party_name} · $${amount}`);
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteReceipt(id: string, partyName: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("receipts").delete().eq("id", id);
  if (error) throw new Error(friendlyError(error));
  await logActivity(supabase, "receipt", `Removed receipt · ${partyName}`);
  revalidatePath("/", "layout");
}
