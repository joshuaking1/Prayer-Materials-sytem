"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  PhoneCall,
  RotateCcw,
  ShoppingBag,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  settleConsignmentAction,
  type ConsignmentState,
} from "../actions";

type SettleItem = {
  id: string;
  product_id: string;
  units_per_box_snapshot: number;
  units_issued: number;
  units_sold: number;
  units_returned: number;
  products: {
    name: string;
    sku: string | null;
  } | null;
};

type Settlement = Record<
  string,
  {
    units_sold: number;
    units_returned: number;
  }
>;

const initialState: ConsignmentState = {
  success: false,
};

export function SettleConsignmentForm({
  consignmentId,
  items,
}: {
  consignmentId: string;
  items: SettleItem[];
}) {
  const router = useRouter();

  const [settlement, setSettlement] = useState<Settlement>(() => {
    const initial: Settlement = {};

    for (const item of items) {
      initial[item.product_id] = {
        units_sold: item.units_sold,
        units_returned: item.units_returned,
      };
    }

    return initial;
  });

  const [state, action, pending] = useActionState(
    settleConsignmentAction,
    initialState
  );

  const payload = useMemo(
    () =>
      JSON.stringify(
        items.map((item) => {
          const value =
            settlement[item.product_id] ?? {
              units_sold: 0,
              units_returned: 0,
            };

          return {
            product_id: item.product_id,
            units_sold: value.units_sold,
            units_returned: value.units_returned,
          };
        })
      ),
    [items, settlement]
  );

  const totalSold = items.reduce((total, item) => {
    return total + (settlement[item.product_id]?.units_sold ?? 0);
  }, 0);

  const totalReturned = items.reduce((total, item) => {
    return total + (settlement[item.product_id]?.units_returned ?? 0);
  }, 0);

  const hasProblem = items.some((item) => {
    const value =
      settlement[item.product_id] ?? {
        units_sold: 0,
        units_returned: 0,
      };

    return (
      value.units_sold + value.units_returned > item.units_issued
    );
  });

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
  }, [state.success, router]);

  function update(
    productId: string,
    key: "units_sold" | "units_returned",
    value: number
  ) {
    setSettlement((previous) => {
      const current = previous[productId] ?? {
        units_sold: 0,
        units_returned: 0,
      };

      return {
        ...previous,
        [productId]: {
          ...current,
          [key]: Math.max(0, value),
        },
      };
    });
  }

  return (
    <form action={action} className="mt-6 app-card p-5">
      <input type="hidden" name="consignment_id" value={consignmentId} />
      <input type="hidden" name="items" value={payload} />

      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <PhoneCall className="size-5" />
        </div>

        <div>
          <h2 className="font-semibold">Settle this consignment</h2>
          <p className="text-xs text-muted-foreground">
            Report what they sold and what came back. Returned stock goes straight back in.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => {
          const value =
            settlement[item.product_id] ?? {
              units_sold: 0,
              units_returned: 0,
            };

          const over =
            value.units_sold + value.units_returned > item.units_issued;

          return (
            <div key={item.id} className="rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {item.products?.name ?? "Unknown material"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.units_issued.toLocaleString("en-GH")} units given out
                  </p>
                </div>

                {over ? (
                  <span className="rounded-full bg-[#ffebe8] px-2 py-1 text-[10px] font-medium text-[#9a2f20]">
                    Too much
                  </span>
                ) : (
                  <span className="rounded-full bg-[#edf5ef] px-2 py-1 text-[10px] font-medium text-[#376045]">
                    {item.units_issued.toLocaleString("en-GH")} total
                  </span>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <QuantityField
                  icon={ShoppingBag}
                  label="Units sold"
                  value={value.units_sold}
                  max={item.units_issued}
                  onChange={(v) =>
                    update(item.product_id, "units_sold", v)
                  }
                />

                <QuantityField
                  icon={RotateCcw}
                  label="Units returned"
                  value={value.units_returned}
                  max={item.units_issued}
                  onChange={(v) =>
                    update(item.product_id, "units_returned", v)
                  }
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-blue-50/70 p-4">
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Sold
            </p>
            <p className="mt-1 font-semibold tabular-nums">
              {totalSold.toLocaleString("en-GH")}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Returning to stock
            </p>
            <p className="mt-1 font-semibold tabular-nums text-[#2f8f5b]">
              {totalReturned.toLocaleString("en-GH")}
            </p>
          </div>
        </div>

        <label className="block min-w-52 text-xs font-medium">
          Note
          <input
            name="notes"
            disabled={pending}
            placeholder="Any notes on the return..."
            className="mt-1.5 h-10 w-full rounded-xl border px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
          />
        </label>
      </div>

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
        disabled={pending || hasProblem}
        className="mt-5 h-12 w-full rounded-xl app-primary"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Settling consignment...
          </>
        ) : (
          <>
            Confirm settlement
            <CheckCircle2 className="ml-2 size-4" />
          </>
        )}
      </Button>

      <p className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-muted-foreground">
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
        Sold plus returned cannot exceed what was given out.
      </p>
    </form>
  );
}

function QuantityField({
  icon: Icon,
  label,
  value,
  max,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const safeValue = Math.min(max, Math.max(0, value));

  return (
    <div className="rounded-xl border bg-blue-50/40 p-2.5">
      <div className="flex items-center justify-between px-0.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <Icon className="size-3" />
          {label}
        </span>

        <span className="text-[9px] text-muted-foreground">
          of {max.toLocaleString("en-GH")}
        </span>
      </div>

      <div className="mt-2 flex items-center">
        <button
          type="button"
          disabled={safeValue <= 0}
          onClick={() => onChange(safeValue - 1)}
          aria-label={`Decrease ${label}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-white transition hover:bg-blue-50 disabled:opacity-30"
        >
          −
        </button>

        <input
          type="number"
          min="0"
          max={max}
          step="1"
          value={safeValue}
          onChange={(event) =>
            onChange(
              Math.min(
                max,
                Math.max(
                  0,
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
          disabled={safeValue >= max}
          onClick={() => onChange(safeValue + 1)}
          aria-label={`Increase ${label}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-white transition hover:bg-blue-50 disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}