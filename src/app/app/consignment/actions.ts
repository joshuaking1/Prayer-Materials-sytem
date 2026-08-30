"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type ConsignmentState = {
  success: boolean;
  error?: string;
  consignmentId?: string;
};

type IssueItem = {
  product_id: string;
  units: number;
};

export async function recordConsignmentAction(
  _previousState: ConsignmentState,
  formData: FormData
): Promise<ConsignmentState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sellerName = String(formData.get("seller_name") ?? "").trim();
  const sellerContact = String(formData.get("seller_contact") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const rawItems = String(formData.get("items") ?? "");

  if (!sellerName) {
    return {
      success: false,
      error: "Enter the seller's name.",
    };
  }

  if (!sellerContact) {
    return {
      success: false,
      error: "Enter a phone number or contact for the seller.",
    };
  }

  let items: IssueItem[];

  try {
    const parsed = JSON.parse(rawItems);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid items");
    }

    items = parsed.map((item) => ({
      product_id: String(item.product_id),
      units: Number(item.units),
    }));
  } catch {
    return {
      success: false,
      error: "The stock being given out could not be read.",
    };
  }

  if (items.length === 0) {
    return {
      success: false,
      error: "Add at least one material to give out.",
    };
  }

  for (const item of items) {
    if (
      !item.product_id ||
      !Number.isInteger(item.units) ||
      item.units <= 0
    ) {
      return {
        success: false,
        error: "One of the quantities is invalid.",
      };
    }
  }

  const { data, error } = await supabase.rpc("record_stock_issue", {
    p_seller_name: sellerName,
    p_seller_contact: sellerContact || null,
    p_items: items,
    p_notes: notes || null,
  });

  if (error) {
    console.error("RECORD CONSIGNMENT ERROR", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    if (error.message.includes("NO_OPEN_DAILY_SESSION")) {
      return {
        success: false,
        error:
          "Today's operations aren't open. Open the day before giving out stock.",
      };
    }

    if (error.message.includes("NO_LOCATION_ASSIGNED")) {
      return {
        success: false,
        error: "Your account is not assigned to a location.",
      };
    }

    if (error.message.includes("INVALID_PRODUCT")) {
      return {
        success: false,
        error: "One of these materials is no longer active.",
      };
    }

    if (error.message.includes("PACKAGING_NOT_FOUND")) {
      return {
        success: false,
        error:
          "One of these materials does not have an active units-per-box setting.",
      };
    }

    if (error.message.includes("INSUFFICIENT_STOCK")) {
      return {
        success: false,
        error:
          "There isn't enough stock to give out those quantities. Refresh and check availability.",
      };
    }

    return {
      success: false,
      error: `The stock couldn't be given out: ${error.message}`,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/consignment");
  revalidatePath("/app/inventory");

  return {
    success: true,
    consignmentId: String(data),
  };
}

type SettleItem = {
  product_id: string;
  units_sold: number;
  units_returned: number;
};

export async function settleConsignmentAction(
  _previousState: ConsignmentState,
  formData: FormData
): Promise<ConsignmentState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const consignmentId = String(formData.get("consignment_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const rawItems = String(formData.get("items") ?? "");

  if (!consignmentId) {
    return {
      success: false,
      error: "The consignment ID is missing.",
    };
  }

  let items: SettleItem[];

  try {
    const parsed = JSON.parse(rawItems);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid items");
    }

    items = parsed.map((item) => ({
      product_id: String(item.product_id),
      units_sold: Number(item.units_sold),
      units_returned: Number(item.units_returned),
    }));
  } catch {
    return {
      success: false,
      error: "The settlement report could not be read.",
    };
  }

  if (items.length === 0) {
    return {
      success: false,
      error: "Report at least one material on the settlement.",
    };
  }

  for (const item of items) {
    if (
      !item.product_id ||
      !Number.isInteger(item.units_sold) ||
      !Number.isInteger(item.units_returned) ||
      item.units_sold < 0 ||
      item.units_returned < 0
    ) {
      return {
        success: false,
        error: "One of the reported quantities is invalid.",
      };
    }
  }

  const { data, error } = await supabase.rpc("settle_stock_issue", {
    p_stock_issue_id: consignmentId,
    p_items: items,
    p_notes: notes || null,
  });

  if (error) {
    console.error("SETTLE CONSIGNMENT ERROR", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    if (error.message.includes("NO_OPEN_DAILY_SESSION")) {
      return {
        success: false,
        error:
          "Today's operations aren't open. Open the day before settling a consignment.",
      };
    }

    if (error.message.includes("ISSUE_ALREADY_SETTLED")) {
      return {
        success: false,
        error:
          "This consignment has already been settled.",
      };
    }

    if (error.message.includes("ISSUE_NOT_FOUND")) {
      return {
        success: false,
        error: "This consignment could not be found.",
      };
    }

    if (error.message.includes("SETTLEMENT_EXCEEDS_ISSUED")) {
      return {
        success: false,
        error:
          "Reported sold plus returned cannot exceed what was given out.",
      };
    }

    return {
      success: false,
      error: `The settlement couldn't be recorded: ${error.message}`,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/consignment");
  revalidatePath(`/app/consignment/${consignmentId}`);
  revalidatePath("/app/inventory");

  return {
    success: true,
    consignmentId: String(data),
  };
}