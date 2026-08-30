import { Boxes, Settings } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  AddProductForm,
  ProductEditForm,
  type EditableProduct,
} from "./product-forms";
import { ResetSystemCard } from "./reset-system";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [{ data: products }, { data: prices }, { data: packaging }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name, sku, category, low_stock_threshold, is_active")
        .order("display_order"),
      supabase
        .from("product_prices")
        .select("product_id, selling_price, cost_price, effective_from")
        .is("effective_to", null),
      supabase
        .from("product_packaging_history")
        .select("product_id, units_per_box, effective_from")
        .is("effective_to", null),
    ]);

  const priceByProduct = new Map(
    (prices ?? []).map((price) => [
      price.product_id,
      {
        selling_price: Number(price.selling_price),
        cost_price: Number(price.cost_price ?? 0),
      },
    ])
  );
  const packagingByProduct = new Map(
    (packaging ?? []).map((row) => [row.product_id, Number(row.units_per_box)])
  );

  const editableProducts: EditableProduct[] = (products ?? []).map((product) => {
    const price = priceByProduct.get(product.id);

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      low_stock_threshold: product.low_stock_threshold,
      is_active: product.is_active,
      selling_price: price?.selling_price ?? 0,
      cost_price: price?.cost_price ?? 0,
      units_per_box: packagingByProduct.get(product.id) ?? 1,
    };
  });

  return (
    <main className="app-page">
      <div className="mb-7">
        <p className="text-sm text-muted-foreground">Configuration</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">
          Settings
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Product catalogue, selling prices, box quantities and stock thresholds.
        </p>
      </div>

      <div className="mb-5">
        <AddProductForm />
      </div>

      <section className="app-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Boxes className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">Prayer materials</h2>
            <p className="text-xs text-muted-foreground">
              Current active values used for sales and stock calculations.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {editableProducts.map((product) => (
            <ProductEditForm key={product.id} product={product} />
          ))}
        </div>
      </section>

      <div className="mt-5 flex items-center gap-2 app-card p-4 text-sm text-muted-foreground">
        <Settings className="size-4" />
        Editing prices and box sizes will use historical records next, so old sales stay unchanged.
      </div>

      <ResetSystemCard />
    </main>
  );
}
