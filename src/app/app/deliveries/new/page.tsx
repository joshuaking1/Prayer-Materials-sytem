import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { NewDelivery } from "./new-delivery";

export type DeliveryProduct = {
  product_id: string;
  name: string;
  short_name: string | null;
  sku: string | null;
  category: string | null;
  units_per_box: number;
};

export default async function NewDeliveryPage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase.rpc("get_current_daily_session");
  const session = sessions?.[0] ?? null;

  if (session?.status !== "open" && session?.status !== "reopened") {
    redirect("/app");
  }

  const { data, error } = await supabase.rpc("get_inventory_overview");

  if (error) {
    throw new Error(error.message);
  }

  const products = (data ?? []) as DeliveryProduct[];

  return <NewDelivery products={products} />;
}
