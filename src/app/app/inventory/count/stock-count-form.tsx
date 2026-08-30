"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  recordStockCountAction,
  type StockCountState,
} from "./actions";

type CountProduct = {
  product_id: string;
  name: string;
  units_per_box: number;
};

type CountState = Record<
  string,
  {
    boxes_counted: number;
    loose_units_counted: number;
  }
>;

const initialState: StockCountState = {
  success: false,
};

export function StockCountForm({
  products,
}: {
  products: CountProduct[];
}) {
  const [counts, setCounts] = useState<CountState>({});
  const [state, action, pending] = useActionState(
    recordStockCountAction,
    initialState
  );

  const payload = useMemo(
    () =>
      JSON.stringify(
        products.map((product) => ({
          product_id: product.product_id,
          boxes_counted:
            counts[product.product_id]?.boxes_counted ?? 0,
          loose_units_counted:
            counts[product.product_id]?.loose_units_counted ?? 0,
        }))
      ),
    [counts, products]
  );

  const totalUnits = products.reduce((total, product) => {
    const count = counts[product.product_id];
    if (!count) return total;

    return (
      total +
      count.boxes_counted * Number(product.units_per_box) +
      count.loose_units_counted
    );
  }, 0);

  function update(
    productId: string,
    key: "boxes_counted" | "loose_units_counted",
    value: number
  ) {
    setCounts((previous) => ({
      ...previous,
      [productId]: {
        boxes_counted:
          previous[productId]?.boxes_counted ?? 0,
        loose_units_counted:
          previous[productId]?.loose_units_counted ?? 0,
        [key]: Math.max(0, value),
      },
    }));
  }

  return (
    <main className="app-page">
      <div className="mb-6">
        <Link
          href="/app/inventory"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Inventory
        </Link>

        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
          Count stock
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Enter what you physically counted. Expected stock is checked after submission.
        </p>
      </div>

      <form action={action} className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <input type="hidden" name="items" value={payload} />

        <section className="space-y-3">
          {products.map((product) => {
            const count = counts[product.product_id] ?? {
              boxes_counted: 0,
              loose_units_counted: 0,
            };

            const physical =
              count.boxes_counted * Number(product.units_per_box) +
              count.loose_units_counted;

            return (
              <div
                key={product.product_id}
                className="app-card p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {product.units_per_box.toLocaleString("en-GH")} units per box
                    </p>
                  </div>

                  <p className="text-sm font-semibold tabular-nums">
                    {physical.toLocaleString("en-GH")} units
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Stepper
                    label="Full boxes"
                    value={count.boxes_counted}
                    onChange={(value) =>
                      update(product.product_id, "boxes_counted", value)
                    }
                  />
                  <Stepper
                    label="Loose units"
                    value={count.loose_units_counted}
                    onChange={(value) =>
                      update(product.product_id, "loose_units_counted", value)
                    }
                  />
                </div>
              </div>
            );
          })}
        </section>

        <aside className="lg:sticky lg:top-[92px] lg:h-fit">
          <div className="app-panel p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Boxes className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Count summary</h2>
                <p className="text-xs text-muted-foreground">
                  {products.length} materials
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-blue-50/70 p-4">
              <p className="text-xs text-muted-foreground">
                Physical stock counted
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                {totalUnits.toLocaleString("en-GH")}
              </p>
            </div>

            <label className="mt-4 block text-xs font-medium">
              Count note
              <textarea
                name="notes"
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            {state.error ? (
              <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs leading-5 text-destructive">
                {state.error}
              </div>
            ) : null}

            {state.success ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#b7cffd] bg-[#eff6ff] p-3 text-xs leading-5 text-blue-700">
                <CheckCircle2 className="size-4" />
                Stock count submitted.
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={pending}
              className="mt-5 h-12 w-full rounded-xl app-primary"
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Submitting count...
                </>
              ) : (
                "Submit stock count"
              )}
            </Button>
          </div>
        </aside>
      </form>
    </main>
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
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-white disabled:opacity-30"
          aria-label={`Decrease ${label}`}
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
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-white"
          aria-label={`Increase ${label}`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
