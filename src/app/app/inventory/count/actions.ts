"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type StockCountState = {
  success: boolean;
  error?: string;
  stockCountId?: string;
};

type CountItem = {
  product_id: string;
  boxes_counted: number;
  loose_units_counted: number;
};

export async function recordStockCountAction(
  _previousState: StockCountState,
  formData: FormData
): Promise<StockCountState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const rawItems = String(formData.get("items") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  let items: CountItem[];

  try {
    const parsed = JSON.parse(rawItems);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid items");
    }

    items = parsed.map((item) => ({
      product_id: String(item.product_id),
      boxes_counted: Number(item.boxes_counted),
      loose_units_counted: Number(item.loose_units_counted),
    }));
  } catch {
    return {
      success: false,
      error: "The stock count could not be read.",
    };
  }

  if (items.length === 0) {
    return {
      success: false,
      error: "Count at least one material.",
    };
  }

  for (const item of items) {
    if (
      !item.product_id ||
      !Number.isInteger(item.boxes_counted) ||
      !Number.isInteger(item.loose_units_counted) ||
      item.boxes_counted < 0 ||
      item.loose_units_counted < 0
    ) {
      return {
        success: false,
        error: "One of the counted quantities is invalid.",
      };
    }
  }

  const { data, error } = await supabase.rpc("record_stock_count", {
    p_items: items,
    p_notes: notes || null,
  });

  if (error) {
    console.error("STOCK COUNT ERROR", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    if (error.message.includes("NO_OPEN_DAILY_SESSION")) {
      return {
        success: false,
        error:
          "Today's operations aren't open. Open the day before counting stock.",
      };
    }

    if (error.message.includes("NO_LOCATION_ASSIGNED")) {
      return {
        success: false,
        error: "Your account is not assigned to a location.",
      };
    }

    return {
      success: false,
      error: `The stock count couldn't be recorded: ${error.message}`,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/inventory");
  revalidatePath("/app/inventory/count");
  revalidatePath("/app/approvals");

  return {
    success: true,
    stockCountId: String(data),
  };
}
