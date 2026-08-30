import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { StockCountForm } from "./stock-count-form";

type CountProduct = {
  product_id: string;
  name: string;
  units_per_box: number;
};

export default async function StockCountPage() {
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

  return <StockCountForm products={(data ?? []) as CountProduct[]} />;
}
