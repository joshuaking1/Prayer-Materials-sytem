"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type CashState = {
  success: boolean;
  error?: string;
};

export async function recordCashCountAction(
  _previousState: CashState,
  formData: FormData
): Promise<CashState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const rawDenominations = String(formData.get("denominations") ?? "");
  const otherCoins = Number(formData.get("other_coins") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim();

  let denominations: { denomination: number; count: number }[];

  try {
    const parsed = JSON.parse(rawDenominations);
    if (!Array.isArray(parsed)) throw new Error("Invalid denominations");
    denominations = parsed.map((item) => ({
      denomination: Number(item.denomination),
      count: Number(item.count),
    }));
  } catch {
    return { success: false, error: "The cash count could not be read." };
  }

  for (const item of denominations) {
    if (
      !Number.isFinite(item.denomination) ||
      !Number.isInteger(item.count) ||
      item.count < 0
    ) {
      return { success: false, error: "One of the cash counts is invalid." };
    }
  }

  if (!Number.isFinite(otherCoins) || otherCoins < 0) {
    return { success: false, error: "Other coins amount is invalid." };
  }

  const { error } = await supabase.rpc("record_cash_count", {
    p_denominations: denominations,
    p_other_coins: otherCoins,
    p_notes: notes || null,
  });

  if (error) {
    console.error("CASH COUNT ERROR", error);
    return {
      success: false,
      error: `The cash count couldn't be recorded: ${error.message}`,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/cash");

  return { success: true };
}

export async function recordCashTransferAction(
  _previousState: CashState,
  formData: FormData
): Promise<CashState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const amount = Number(formData.get("amount") ?? 0);
  const destination = String(formData.get("destination") ?? "").trim();
  const method = String(formData.get("method") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim();
  const transferDate = String(formData.get("transfer_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Enter a transfer amount greater than zero." };
  }

  if (!destination) {
    return { success: false, error: "Enter where the cash was sent." };
  }

  if (!method) {
    return { success: false, error: "Choose the transfer method." };
  }

  const { error } = await supabase.rpc("record_cash_transfer", {
    p_amount: amount,
    p_destination: destination,
    p_method: method,
    p_reference: reference || null,
    p_transfer_date: transferDate || null,
    p_notes: notes || null,
  });

  if (error) {
    console.error("CASH TRANSFER ERROR", error);
    return {
      success: false,
      error: `The cash transfer couldn't be recorded: ${error.message}`,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/cash");

  return { success: true };
}
