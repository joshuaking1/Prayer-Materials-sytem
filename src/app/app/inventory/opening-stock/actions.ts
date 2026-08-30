"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type OpeningStockState = {
  success: boolean;
  error?: string;
  migrationId?: string;
};

type OpeningStockItem = {
  product_id: string;
  reference_quantity: number;
  confirmed_quantity: number;
};

export async function confirmOpeningStockAction(
  _previousState: OpeningStockState,
  formData: FormData
): Promise<OpeningStockState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const payload = String(formData.get("items") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!payload) {
    return {
      success: false,
      error: "No opening stock information was submitted.",
    };
  }

  let items: OpeningStockItem[];

  try {
    const parsed = JSON.parse(payload);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid payload");
    }

    items = parsed.map((item) => ({
      product_id: String(item.product_id),

      reference_quantity: Math.max(
        0,
        Number(item.reference_quantity) || 0
      ),

      confirmed_quantity: Math.max(
        0,
        Number(item.confirmed_quantity) || 0
      ),
    }));
  } catch {
    return {
      success: false,
      error: "The opening stock information could not be read.",
    };
  }

  if (items.length === 0) {
    return {
      success: false,
      error: "No opening stock items were submitted.",
    };
  }

  for (const item of items) {
    if (!item.product_id) {
      return {
        success: false,
        error: "One of the products is missing its ID.",
      };
    }

    if (!Number.isInteger(item.reference_quantity)) {
      return {
        success: false,
        error: "One of the workbook quantities is invalid.",
      };
    }

    if (!Number.isInteger(item.confirmed_quantity)) {
      return {
        success: false,
        error:
          "Opening stock must be entered as whole units.",
      };
    }
  }

  const { data, error } = await supabase.rpc(
    "confirm_opening_inventory",
    {
      p_items: items,
      p_notes: notes || null,
    }
  );

  if (error) {
    console.error("OPENING STOCK ERROR", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    if (
      error.message.includes(
        "OPENING_INVENTORY_ALREADY_IMPORTED"
      )
    ) {
      return {
        success: false,
        error:
          "Opening stock has already been confirmed for this location.",
      };
    }

    if (error.message.includes("EXISTING_STOCK_FOUND")) {
      return {
        success: false,
        error:
          "Some products already have stock. Opening stock can't overwrite existing inventory.",
      };
    }

    if (error.message.includes("NOT_AUTHORIZED")) {
      return {
        success: false,
        error:
          "Only a supervisor or administrator can confirm opening stock.",
      };
    }

    if (error.message.includes("NO_LOCATION_ASSIGNED")) {
      return {
        success: false,
        error:
          "Your account isn't assigned to a location.",
      };
    }

    if (error.message.includes("INVALID_PRODUCT")) {
      return {
        success: false,
        error:
          "One of the submitted products is no longer valid.",
      };
    }

    if (error.message.includes("INVALID_QUANTITY")) {
      return {
        success: false,
        error:
          "One or more opening quantities are invalid.",
      };
    }

    return {
      success: false,
      error: `Opening stock couldn't be confirmed: ${error.message}`,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/inventory");
  revalidatePath("/app/inventory/opening-stock");

  return {
    success: true,
    migrationId: String(data),
  };
}
