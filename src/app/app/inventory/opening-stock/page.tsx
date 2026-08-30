import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { OpeningStockWizard } from "./opening-stock-wizard";

type InventoryProduct = {
  product_id: string;
  name: string;
  sku: string;
  current_quantity: number;
  units_per_box: number;
  selling_price: number;
};

const EXCEL_REFERENCE: Record<string, number> = {
  "YESU-MOGYA": 800,
  "GRACE-WATER": 410,
  "GRACE-CREAM": 600,
  OIL: 300,
  "GRACE-SOAP": 300,
  "GRACE-POWDER": 400,
  SOBOLO: 4500,
  BOOKS: 0,
  "STICKERS-PHONE": 500,
  "STICKERS-6X6": 100,
  "STICKERS-8X4": 0,
  "STICKERS-12X12": 50,
  "STICKERS-15X15": 30,
  FANS: 0,
  CALENDAR: 0,
  "T-SHIRT": 0,
};

export default async function OpeningStockPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, location_id")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !profile.is_active ||
    !["administrator", "supervisor"].includes(profile.role)
  ) {
    redirect("/app/inventory");
  }

  const { data: previousMigration } = await supabase
    .from("inventory_opening_migrations")
    .select("id, imported_at, status")
    .eq("location_id", profile.location_id)
    .eq("status", "completed")
    .maybeSingle();

  const { data, error } = await supabase.rpc(
    "get_inventory_overview"
  );

  if (error) {
    throw new Error(error.message);
  }

  const products = (data ?? []) as InventoryProduct[];

  const preparedProducts = products.map((product) => ({
    ...product,
    reference_quantity:
      EXCEL_REFERENCE[product.sku] ?? 0,
  }));

  return (
    <OpeningStockWizard
      products={preparedProducts}
      alreadyImported={Boolean(previousMigration)}
      importedAt={previousMigration?.imported_at ?? null}
    />
  );
}
