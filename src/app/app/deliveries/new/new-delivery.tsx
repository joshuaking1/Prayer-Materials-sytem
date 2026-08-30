"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Minus,
  PackageCheck,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { recordDeliveryAction, type DeliveryState } from "../actions";
import type { DeliveryProduct } from "./page";

type DeliveryCart = Record<string, { boxes: number; loose_units: number }>;

const initialState: DeliveryState = { success: false };

export function NewDelivery({ products }: { products: DeliveryProduct[] }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<DeliveryCart>({});
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [state, action, pending] = useActionState(
    recordDeliveryAction,
    initialState
  );

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products;

    return products.filter((product) =>
      [product.name, product.short_name, product.sku, product.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [products, query]);

  const cartItems = useMemo(
    () =>
      products
        .filter((product) => cart[product.product_id])
        .map((product) => ({
          ...product,
          boxes: cart[product.product_id].boxes,
          loose_units: cart[product.product_id].loose_units,
          total_units:
            cart[product.product_id].boxes * Number(product.units_per_box) +
            cart[product.product_id].loose_units,
        }))
        .filter((item) => item.total_units > 0),
    [cart, products]
  );

  const totalUnits = cartItems.reduce(
    (total, item) => total + item.total_units,
    0
  );

  const payload = JSON.stringify(
    cartItems.map((item) => ({
      product_id: item.product_id,
      boxes: item.boxes,
      loose_units: item.loose_units,
    }))
  );

  useEffect(() => {
    if (!state.success) return;
    router.push("/app/deliveries");
  }, [state.success, router]);

  function updateItem(
    product: DeliveryProduct,
    next: { boxes?: number; loose_units?: number }
  ) {
    setCart((previous) => {
      const current = previous[product.product_id] ?? {
        boxes: 0,
        loose_units: 0,
      };

      const value = {
        boxes: Math.max(0, next.boxes ?? current.boxes),
        loose_units: Math.max(0, next.loose_units ?? current.loose_units),
      };

      if (value.boxes === 0 && value.loose_units === 0) {
        const copy = { ...previous };
        delete copy[product.product_id];
        return copy;
      }

      return { ...previous, [product.product_id]: value };
    });
  }

  return (
    <main className="app-page">
      <div className="mb-6">
        <Link
          href="/app/deliveries"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Deliveries
        </Link>

        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
          Receive materials
        </h1>
      </div>

      <form action={action} className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <input type="hidden" name="items" value={payload} />
        <input type="hidden" name="idempotency_key" value={idempotencyKey} />

        <section className="space-y-5">
          <div className="app-panel p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Invoice details</h2>
                <p className="text-xs text-muted-foreground">
                  One invoice can contain many materials.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Invoice number" name="invoice_number" required />
              <Field label="Invoice date" name="invoice_date" type="date" defaultValue={today} required />
              <Field label="Source / supplier" name="supplier" />
              <Field label="Note" name="notes" />
            </div>
          </div>

          <div className="app-panel p-5">
            <div className="mb-4">
              <h2 className="font-semibold">Add received products</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter boxes and loose units. The system uses each product&apos;s units per box.
              </p>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                placeholder="Search materials..."
                className="h-11 w-full rounded-xl border border-blue-100 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-3">
              {filteredProducts.map((product) => {
                const value = cart[product.product_id] ?? {
                  boxes: 0,
                  loose_units: 0,
                };
                const unitsPerBox = Number(product.units_per_box) || 1;
                const total = value.boxes * unitsPerBox + value.loose_units;

                return (
                  <div key={product.product_id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {unitsPerBox.toLocaleString("en-GH")} units per box
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">
                        {total.toLocaleString("en-GH")} units
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Stepper
                        label="Boxes"
                        value={value.boxes}
                        onChange={(boxes) => updateItem(product, { boxes })}
                      />
                      <Stepper
                        label="Loose units"
                        value={value.loose_units}
                        onChange={(loose_units) =>
                          updateItem(product, { loose_units })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="lg:sticky lg:top-[92px] lg:h-fit">
          <div className="app-panel p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Delivery review</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {cartItems.length} products · {totalUnits.toLocaleString("en-GH")} units
                </p>
              </div>
              <PackageCheck className="size-5 text-muted-foreground" />
            </div>

            {cartItems.length === 0 ? (
              <div className="py-12 text-center">
                <Boxes className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No materials added</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {cartItems.map((item) => (
                  <div key={item.product_id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.boxes} boxes + {item.loose_units} loose
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold tabular-nums">
                        {item.total_units.toLocaleString("en-GH")}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((previous) => {
                            const copy = { ...previous };
                            delete copy[item.product_id];
                            return copy;
                          })
                        }
                        aria-label={`Remove ${item.name}`}
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-blue-50 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {state.error ? (
              <div role="alert" className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs leading-5 text-destructive">
                {state.error}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={pending || cartItems.length === 0}
              className="mt-5 h-12 w-full rounded-xl app-primary"
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Recording delivery...
                </>
              ) : (
                <>
                  Confirm delivery
                  <ChevronRight className="ml-1 size-4" />
                </>
              )}
            </Button>

            <p className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
              Stock increases only after confirmation succeeds.
            </p>
          </div>
        </aside>
      </form>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-medium">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 h-11 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-xl border bg-blue-50/40 p-2.5">
      <span className="text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
      <div className="mt-2 flex items-center">
        <button
          type="button"
          disabled={value <= 0}
          onClick={() => onChange(value - 1)}
          aria-label={`Decrease ${label}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-white transition hover:bg-blue-50 disabled:opacity-30"
        >
          <Minus className="size-3.5" />
        </button>
        <input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(event) =>
            onChange(
              Math.max(0, Number.parseInt(event.target.value || "0", 10) || 0)
            )
          }
          className="min-w-0 flex-1 bg-transparent text-center text-lg font-semibold tabular-nums outline-none"
          aria-label={label}
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-white transition hover:bg-blue-50"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
