import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { NewSale } from "./new-sale";

export type SaleProduct = {
  product_id: string;
  name: string;
  short_name: string | null;
  sku: string;
  category: string | null;
  current_quantity: number;
  units_per_box: number;
  selling_price: number;
};

export default async function NewSalePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: sessions } = await supabase.rpc(
    "get_current_daily_session"
  );

  const session = sessions?.[0] ?? null;

  const dayIsOpen =
    session?.status === "open" ||
    session?.status === "reopened";

  if (!dayIsOpen) {
    redirect("/app");
  }

  const { data, error } = await supabase.rpc(
    "get_inventory_overview"
  );

  if (error) {
    throw new Error(error.message);
  }

  const products = (data ?? []) as SaleProduct[];

  return <NewSale products={products} />;
}
