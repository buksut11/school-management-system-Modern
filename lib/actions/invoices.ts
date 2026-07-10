"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import type { FormState } from "@/lib/actions/students";
import type { InvoiceItem, PartyType, PaymentMethod } from "@/lib/types/database";

const PARTY_TYPES: PartyType[] = ["student", "teacher", "staff"];

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

function parseParty(formData: FormData): { error: string } | ParsedParty {
  const partyType = str(formData, "party_type") as PartyType | null;
  if (!partyType || !PARTY_TYPES.includes(partyType)) return { error: "Pick who this is for." };
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
  const party = parseParty(formData);
  if ("error" in party) return party;

  const items = parseItems(str(formData, "items"));
  if (!items || items.length === 0) {
    return { error: "Add at least one line item with a description and a valid amount." };
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
  if (error) return { error: error.message };

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
  if (error) throw new Error(error.message);
  await logActivity(supabase, "invoice", `Removed invoice · ${partyName}`);
  revalidatePath("/", "layout");
}

export async function recordInvoicePayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const invoiceId = str(formData, "invoice_id");
  const amount = Number(str(formData, "amount") ?? 0);
  if (!invoiceId) return { error: "Missing invoice." };
  if (!(amount > 0)) return { error: "Enter an amount greater than zero." };

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "party_type, party_id, party_name, party_detail, party_phone, party_address, parent_name, parent_phone"
    )
    .eq("id", invoiceId)
    .single();
  if (!invoice) return { error: "Invoice not found." };

  const { error } = await supabase.from("receipts").insert({
    invoice_id: invoiceId,
    party_type: invoice.party_type,
    party_id: invoice.party_id,
    party_name: invoice.party_name,
    party_detail: invoice.party_detail,
    party_phone: invoice.party_phone,
    party_address: invoice.party_address,
    parent_name: invoice.parent_name,
    parent_phone: invoice.parent_phone,
    amount,
    method: (str(formData, "method") ?? "cash") as PaymentMethod,
    note: str(formData, "note"),
  });
  if (error) return { error: error.message };

  await logActivity(
    supabase,
    "receipt",
    `Invoice payment · ${invoice.party_name} · $${amount}`
  );
  revalidatePath("/", "layout");
  return { success: true };
}

export async function saveReceipt(_prev: FormState, formData: FormData): Promise<FormState> {
  const party = parseParty(formData);
  if ("error" in party) return party;

  const amount = Number(str(formData, "amount") ?? 0);
  if (!(amount > 0)) return { error: "Enter an amount greater than zero." };

  const supabase = await createClient();
  const receivedDate = str(formData, "received_date");
  const { error } = await supabase.from("receipts").insert({
    ...party,
    amount,
    method: (str(formData, "method") ?? "cash") as PaymentMethod,
    note: str(formData, "note"),
    ...(receivedDate ? { received_at: new Date(`${receivedDate}T12:00:00`).toISOString() } : {}),
  });
  if (error) return { error: error.message };

  await logActivity(supabase, "receipt", `Receipt issued · ${party.party_name} · $${amount}`);
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteReceipt(id: string, partyName: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("receipts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity(supabase, "receipt", `Removed receipt · ${partyName}`);
  revalidatePath("/", "layout");
}
