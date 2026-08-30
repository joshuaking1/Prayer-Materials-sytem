import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  PackageOpen,
  Search,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type InventoryItem = {
  product_id: string;
  name: string;
  short_name: string | null;
  sku: string | null;
  category: string | null;
  current_quantity: number;
  units_per_box: number;
  selling_price: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
  full_boxes: number;
  loose_units: number;
  retail_value: number;
};

export default async function InventoryPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_inventory_overview"
  );

  if (error) {
    console.error("INVENTORY LOAD ERROR", error);
  }

  const items = (data ?? []) as InventoryItem[];

  const totalUnits = items.reduce(
    (total, item) => total + item.current_quantity,
    0
  );

  const totalValue = items.reduce(
    (total, item) => total + Number(item.retail_value),
    0
  );

  const lowStockCount = items.filter(
    (item) => item.is_low_stock
  ).length;

  return (
    <main className="app-page">
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Materials
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">
            Inventory
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            What is physically expected to be available at
            Main Office.
          </p>
        </div>

        <Link
          href="/app/inventory/opening-stock"
          className="inline-flex h-10 items-center justify-center rounded-xl app-primary px-4 text-sm font-medium"
        >
          Set opening stock
          <ArrowRight className="ml-2 size-4" />
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="Total units"
          value={totalUnits.toLocaleString("en-GH")}
        />

        <Metric
          label="Retail stock value"
          value={formatMoney(totalValue)}
        />

        <Metric
          label="Low stock"
          value={String(lowStockCount)}
          attention={lowStockCount > 0}
        />
      </section>

      <section className="mt-7">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">
              Prayer materials
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {items.length} active products
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="search"
              placeholder="Search materials..."
              className="h-10 w-full rounded-xl border border-blue-100 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyInventory />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <InventoryCard
                key={item.product_id}
                item={item}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function InventoryCard({
  item,
}: {
  item: InventoryItem;
}) {
  return (
    <Link
      href={`/app/inventory/${item.product_id}`}
      className="group app-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:-translate-y-0.5 hover:border-[#9dbcf7] hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Boxes className="size-[18px]" />
        </div>

        {item.is_low_stock ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fff3df] px-2 py-1 text-[10px] font-medium text-[#825916]">
            <AlertTriangle className="size-3" />
            Low stock
          </span>
        ) : (
          <span className="rounded-full bg-[#edf5ef] px-2 py-1 text-[10px] font-medium text-[#376045]">
            In stock
          </span>
        )}
      </div>

      <div className="mt-5">
        <p className="font-semibold tracking-[-0.02em]">
          {item.name}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {formatMoney(item.selling_price)} each
        </p>
      </div>

      <div className="mt-5">
        <div className="flex items-end gap-2">
          <p className="text-3xl font-semibold tracking-[-0.04em]">
            {item.current_quantity.toLocaleString("en-GH")}
          </p>

          <p className="pb-1 text-xs text-muted-foreground">
            units
          </p>
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          {formatPackaging(
            item.full_boxes,
            item.loose_units,
            item.units_per_box
          )}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t pt-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            Retail value
          </p>

          <p className="mt-1 text-sm font-medium tabular-nums">
            {formatMoney(item.retail_value)}
          </p>
        </div>

        <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function Metric({
  label,
  value,
  attention = false,
}: {
  label: string;
  value: string;
  attention?: boolean;
}) {
  return (
    <div className="app-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p
        className={
          attention
            ? "mt-2 text-2xl font-semibold tracking-[-0.035em] text-[#895e18]"
            : "mt-2 text-2xl font-semibold tracking-[-0.035em]"
        }
      >
        {value}
      </p>
    </div>
  );
}

function EmptyInventory() {
  return (
    <div className="app-card px-6 py-14 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-[#eff3ef] text-[#45604d]">
        <PackageOpen className="size-5" />
      </div>

      <p className="mt-4 text-sm font-medium">
        No prayer materials yet
      </p>

      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
        Products will appear here when they have been added
        to the catalogue.
      </p>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(Number(value));
}

function formatPackaging(
  boxes: number,
  loose: number,
  unitsPerBox: number
) {
  if (boxes === 0) {
    return `${loose.toLocaleString("en-GH")} loose units`;
  }

  if (loose === 0) {
    return `${boxes.toLocaleString(
      "en-GH"
    )} boxes · ${unitsPerBox} per box`;
  }

  return `${boxes.toLocaleString(
    "en-GH"
  )} boxes + ${loose.toLocaleString(
    "en-GH"
  )} loose · ${unitsPerBox} per box`;
}
