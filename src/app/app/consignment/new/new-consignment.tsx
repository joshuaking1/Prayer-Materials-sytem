"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  HandCoins,
  Loader2,
  Minus,
  PackageOpen,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  recordConsignmentAction,
  type ConsignmentState,
} from "../actions";
import type { ConsignmentProduct } from "./page";

type Cart = Record<string, number>;

const initialState: ConsignmentState = {
  success: false,
};

export function NewConsignment({
  products,
}: {
  products: ConsignmentProduct[];
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Cart>({});
  const [state, action, pending] = useActionState(
    recordConsignmentAction,
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
        .filter((product) => (cart[product.product_id] ?? 0) > 0)
        .map((product) => ({
          ...product,
          units: cart[product.product_id],
        })),
    [cart, products]
  );

  const totalUnits = cartItems.reduce((total, item) => total + item.units, 0);

  const payload = useMemo(
    () =>
      JSON.stringify(
        cartItems.map((item) => ({
          product_id: item.product_id,
          units: item.units,
        }))
      ),
    [cartItems]
  );

  useEffect(() => {
    if (!state.success || !state.consignmentId) return;
    router.push(`/app/consignment/${state.consignmentId}`);
  }, [state.success, state.consignmentId, router]);

  function update(
    product: ConsignmentProduct,
    units: number
  ) {
    const safeUnits = Math.max(
      0,
      Math.min(units, product.current_quantity)
    );

    setCart((previous) => {
      const next = { ...previous };

      if (safeUnits === 0) {
        delete next[product.product_id];
      } else {
        next[product.product_id] = safeUnits;
      }

      return next;
    });
  }

  return (
    <main className="app-page">
      <div className="mb-6">
        <Link
          href="/app/consignment"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Consignment
        </Link>

        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
          Give out stock
        </h1>
      </div>

      <form action={action} className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <input type="hidden" name="items" value={payload} />

        <section className="space-y-5">
          <div className="app-panel p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <UserRound className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Who is taking the stock</h2>
                <p className="text-xs text-muted-foreground">
                  We record the seller and their contact so the stock is traceable.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Seller name" name="seller_name" required />
              <Field label="Phone / contact" name="seller_contact" type="tel" required />
              <div className="sm:col-span-2">
                <Field label="Note" name="notes" />
              </div>
            </div>
          </div>

          <div className="app-panel p-5">
            <div className="mb-4">
              <h2 className="font-semibold">Choose materials</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick what the seller takes. The amount will come off available stock.
              </p>
            </div>

            <div className="relative mb-4 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                placeholder="Search materials..."
                className="h-11 w-full rounded-xl border border-blue-100 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed px-5 py-12 text-center">
                <PackageOpen className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No materials found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map((product) => {
                  const units = cart[product.product_id] ?? 0;
                  const unitWithinStock = (value: number) =>
                    Math.max(0, Math.min(value, product.current_quantity));

                  return (
                    <div key={product.product_id} className="rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {product.current_quantity.toLocaleString("en-GH")} available
                          </p>
                        </div>

                        {units > 0 ? (
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                            {units.toLocaleString("en-GH")} units
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 max-w-56">
                        <Stepper
                          label="Units to give"
                          value={units}
                          min={0}
                          max={product.current_quantity}
                          onChange={(value) =>
                            update(product, unitWithinStock(value))
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="lg:sticky lg:top-[92px] lg:h-fit">
          <div className="app-panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Stock going out
                </p>

                <p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">
                  {totalUnits.toLocaleString("en-GH")}
                </p>
              </div>

              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <HandCoins className="size-5" />
              </div>
            </div>

            {cartItems.length > 0 ? (
              <div className="mt-5 space-y-3">
                {cartItems.map((item) => (
                  <div key={item.product_id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.units.toLocaleString("en-GH")} units
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => update(item, 0)}
                      aria-label={`Remove ${item.name}`}
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-blue-50 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {state.error ? (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs leading-5 text-destructive"
              >
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
                  Giving out stock...
                </>
              ) : (
                "Give out stock"
              )}
            </Button>

            <p className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
              Stock only comes off after this is confirmed.
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
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  const Icon =
    name === "seller_contact"
      ? Phone
      : name === "seller_name"
      ? UserRound
      : null;

  return (
    <label className="block text-xs font-medium">
      {label}

      <div className="relative mt-2">
        {Icon ? (
          <Icon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        ) : null}

        <input
          name={name}
          type={type}
          required={required}
          className={`h-11 w-full rounded-xl border border-blue-100 bg-white text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${
            Icon ? "pl-9" : "px-3"
          }`}
        />
      </div>
    </label>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
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
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          aria-label={`Decrease ${label}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-white transition hover:bg-blue-50 disabled:opacity-30"
        >
          <Minus className="size-3.5" />
        </button>

        <input
          type="number"
          min={min}
          max={max}
          step="1"
          value={value}
          onChange={(event) =>
            onChange(
              Math.min(
                max,
                Math.max(
                  min,
                  Number.parseInt(event.target.value || "0", 10) || 0
                )
              )
            )
          }
          className="min-w-0 flex-1 bg-transparent text-center text-lg font-semibold tabular-nums outline-none"
          aria-label={label}
        />

        <button
          type="button"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-white transition hover:bg-blue-50 disabled:opacity-30"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}