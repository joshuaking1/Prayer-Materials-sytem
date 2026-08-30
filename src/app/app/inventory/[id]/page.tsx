import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  Clock3,
  Package,
  TrendingDown,
  TrendingUp,
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

type Movement = {
  id: string;
  movement_type: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reason: string | null;
  created_at: string;
  profiles:
    | {
        display_name: string | null;
        username: string | null;
      }
    | {
        display_name: string | null;
        username: string | null;
      }[]
    | null;
};

export default async function InventoryProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: overview }, { data: movements }] = await Promise.all([
    supabase.rpc("get_inventory_overview"),
    supabase
      .from("inventory_movements")
      .select(
        `
        id,
        movement_type,
        quantity_change,
        quantity_before,
        quantity_after,
        reason,
        created_at,
        profiles:created_by (
          display_name,
          username
        )
      `
      )
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const item = ((overview ?? []) as InventoryItem[]).find(
    (row) => row.product_id === id
  );

  if (!item) {
    notFound();
  }

  return (
    <main className="app-page">
      <Link
        href="/app/inventory"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Inventory
      </Link>

      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Boxes className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {item.category ?? "Prayer material"}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[30px]">
                {item.name}
              </h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            SKU: {item.sku ?? "Not set"}
          </p>
        </div>

        <span
          className={
            item.is_low_stock
              ? "inline-flex rounded-full bg-[#fff3df] px-3 py-1.5 text-xs font-medium text-[#825916]"
              : "inline-flex rounded-full bg-[#edf5ef] px-3 py-1.5 text-xs font-medium text-[#376045]"
          }
        >
          {item.is_low_stock ? "Low stock" : "In stock"}
        </span>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Current units"
          value={item.current_quantity.toLocaleString("en-GH")}
        />
        <Metric
          label="Packaging"
          value={formatPackaging(
            item.full_boxes,
            item.loose_units,
            item.units_per_box
          )}
        />
        <Metric label="Selling price" value={money(item.selling_price)} />
        <Metric label="Retail value" value={money(item.retail_value)} />
      </section>

      <section className="mt-7 grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="app-card p-5">
          <h2 className="font-semibold">Stock rules</h2>
          <div className="mt-5 space-y-4">
            <InfoRow
              icon={Package}
              label="Units per box"
              value={String(item.units_per_box)}
            />
            <InfoRow
              icon={TrendingDown}
              label="Low stock threshold"
              value={String(item.low_stock_threshold)}
            />
            <InfoRow
              icon={TrendingUp}
              label="Stock position"
              value={
                item.is_low_stock
                  ? "Needs replenishment"
                  : "Healthy"
              }
            />
          </div>
        </div>

        <div className="app-card p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Clock3 className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">Recent stock movements</h2>
              <p className="text-xs text-muted-foreground">
                Latest changes that affected this product.
              </p>
            </div>
          </div>

          {(movements ?? []).length === 0 ? (
            <p className="rounded-2xl bg-blue-50/60 p-5 text-sm text-muted-foreground">
              No stock movement has been recorded yet.
            </p>
          ) : (
            <div className="divide-y">
              {((movements ?? []) as Movement[]).map((movement) => (
                <MovementRow key={movement.id} movement={movement} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="app-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-[-0.035em]">
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Icon className="size-4" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function MovementRow({
  movement,
}: {
  movement: Movement;
}) {
  const profile = Array.isArray(movement.profiles)
    ? movement.profiles[0]
    : movement.profiles;
  const positive = Number(movement.quantity_change) >= 0;

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium capitalize">
          {movement.movement_type.replaceAll("_", " ")}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {formatDate(movement.created_at)} ·{" "}
          {profile?.display_name || profile?.username || "System"}
          {movement.reason ? ` · ${movement.reason}` : ""}
        </p>
      </div>
      <div className="text-right">
        <p
          className={
            positive
              ? "text-sm font-semibold text-blue-700 tabular-nums"
              : "text-sm font-semibold text-[#9a3412] tabular-nums"
          }
        >
          {positive ? "+" : ""}
          {Number(movement.quantity_change).toLocaleString("en-GH")}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {movement.quantity_before} → {movement.quantity_after}
        </p>
      </div>
    </div>
  );
}

function money(value: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Accra",
  }).format(new Date(value));
}

function formatPackaging(
  boxes: number,
  loose: number,
  unitsPerBox: number
) {
  if (boxes === 0) {
    return `${loose.toLocaleString("en-GH")} loose`;
  }

  if (loose === 0) {
    return `${boxes.toLocaleString("en-GH")} boxes`;
  }

  return `${boxes.toLocaleString("en-GH")} boxes + ${loose.toLocaleString(
    "en-GH"
  )} loose (${unitsPerBox}/box)`;
}
