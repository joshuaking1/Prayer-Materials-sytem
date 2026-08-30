"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = {
  success: boolean;
  error?: string;
};

export type ResetState = {
  success: boolean;
  error?: string;
  resetComplete?: boolean;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "administrator") {
    return false;
  }

  return true;
}

export async function updateProductAction(
  _previousState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  if (!(await requireAdmin())) {
    return {
      success: false,
      error: "Only administrators can edit settings.",
    };
  }

  const productId = String(formData.get("product_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const sellingPrice = Number(formData.get("selling_price") ?? 0);
  const costPrice = Number(formData.get("cost_price") ?? 0);
  const unitsPerBox = Number(formData.get("units_per_box") ?? 0);
  const lowStockThreshold = Number(formData.get("low_stock_threshold") ?? 0);
  const isActive = formData.get("is_active") === "on";

  if (!productId || !name) {
    return {
      success: false,
      error: "Product name is required.",
    };
  }

  if (
    !Number.isFinite(sellingPrice) ||
    sellingPrice < 0 ||
    !Number.isFinite(costPrice) ||
    costPrice < 0 ||
    !Number.isInteger(unitsPerBox) ||
    unitsPerBox <= 0 ||
    !Number.isInteger(lowStockThreshold) ||
    lowStockThreshold < 0
  ) {
    return {
      success: false,
      error: "Check the price, box quantity and low stock values.",
    };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: productError } = await admin
    .from("products")
    .update({
      name,
      sku: sku || null,
      category: category || null,
      low_stock_threshold: lowStockThreshold,
      is_active: isActive,
    })
    .eq("id", productId);

  if (productError) {
    return {
      success: false,
      error: productError.message,
    };
  }

  await admin
    .from("product_prices")
    .update({ effective_to: now })
    .eq("product_id", productId)
    .is("effective_to", null);

  const { error: priceError } = await admin.from("product_prices").insert({
    product_id: productId,
    selling_price: sellingPrice,
    cost_price: costPrice,
    effective_from: now,
  });

  await admin
    .from("product_packaging_history")
    .update({ effective_to: now })
    .eq("product_id", productId)
    .is("effective_to", null);

  const { error: packagingError } = await admin
    .from("product_packaging_history")
    .insert({
      product_id: productId,
      units_per_box: unitsPerBox,
      effective_from: now,
    });

  if (priceError || packagingError) {
    return {
      success: false,
      error: priceError?.message || packagingError?.message,
    };
  }

  revalidatePath("/app/settings");
  revalidatePath("/app/inventory");
  revalidatePath(`/app/inventory/${productId}`);
  revalidatePath("/app/sales/new");

  return {
    success: true,
  };
}

export async function createProductAction(
  _previousState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  if (!(await requireAdmin())) {
    return {
      success: false,
      error: "Only administrators can add products.",
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const sellingPrice = Number(formData.get("selling_price") ?? 0);
  const costPrice = Number(formData.get("cost_price") ?? 0);
  const unitsPerBox = Number(formData.get("units_per_box") ?? 0);
  const lowStockThreshold = Number(formData.get("low_stock_threshold") ?? 0);

  if (!name) {
    return {
      success: false,
      error: "Product name is required.",
    };
  }

  if (
    !Number.isFinite(sellingPrice) ||
    sellingPrice < 0 ||
    !Number.isInteger(unitsPerBox) ||
    unitsPerBox <= 0
  ) {
    return {
      success: false,
      error: "Enter a valid selling price and units per box.",
    };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: product, error: productError } = await admin
    .from("products")
    .insert({
      name,
      short_name: name,
      sku: sku || null,
      category: category || null,
      low_stock_threshold: Number.isInteger(lowStockThreshold)
        ? lowStockThreshold
        : 0,
      is_active: true,
    })
    .select("id")
    .single();

  if (productError || !product) {
    return {
      success: false,
      error: productError?.message || "Product could not be added.",
    };
  }

  const [{ error: priceError }, { error: packagingError }] =
    await Promise.all([
      admin.from("product_prices").insert({
        product_id: product.id,
        selling_price: sellingPrice,
        cost_price: Number.isFinite(costPrice) ? costPrice : 0,
        effective_from: now,
      }),
      admin.from("product_packaging_history").insert({
        product_id: product.id,
        units_per_box: unitsPerBox,
        effective_from: now,
      }),
    ]);

  if (priceError || packagingError) {
    return {
      success: false,
      error: priceError?.message || packagingError?.message,
    };
  }

  revalidatePath("/app/settings");
  revalidatePath("/app/inventory");
  revalidatePath("/app/sales/new");

  return {
    success: true,
  };
}

export async function resetSystemAction(
  _previousState: ResetState,
  formData: FormData
): Promise<ResetState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const confirmation = String(
    formData.get("confirmation") ?? ""
  ).trim();

  const { data, error } = await supabase.rpc("reset_system", {
    p_confirmation: confirmation,
  });

  if (error) {
    console.error("SYSTEM RESET ERROR", {
      message: error.message,
      code: error.code,
    });

    if (error.message.includes("NOT_AUTHORIZED")) {
      return {
        success: false,
        error: "Only administrators can reset the system.",
      };
    }

    if (error.message.includes("WRONG_CONFIRMATION")) {
      return {
        success: false,
        error: "Type RESET to confirm the reset.",
      };
    }

    return {
      success: false,
      error: `The system couldn't be reset: ${error.message}`,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/settings");
  revalidatePath("/app/inventory");
  revalidatePath("/app/sales");
  revalidatePath("/app/deliveries");
  revalidatePath("/app/consignment");
  revalidatePath("/app/cash");
  revalidatePath("/app/audit");
  revalidatePath("/app/reports");

  return {
    success: true,
    resetComplete: data === "RESET_COMPLETE",
  };
}
