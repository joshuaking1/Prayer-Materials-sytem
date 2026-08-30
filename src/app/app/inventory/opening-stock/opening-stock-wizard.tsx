"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  confirmOpeningStockAction,
  type OpeningStockState,
} from "./actions";

type Product = {
  product_id: string;
  name: string;
  sku: string;
  units_per_box: number;
  selling_price: number;
  current_quantity: number;
  reference_quantity: number;
};

type Count = {
  boxes: number;
  loose: number;
};

const initialState: OpeningStockState = {
  success: false,
};

export function OpeningStockWizard({
  products,
  alreadyImported,
  importedAt,
}: {
  products: Product[];
  alreadyImported: boolean;
  importedAt: string | null;
}) {
  const router = useRouter();

  const [step, setStep] = useState(0);

  const [counts, setCounts] = useState<
    Record<string, Count>
  >(() =>
    Object.fromEntries(
      products.map((product) => {
        const unitsPerBox = Math.max(
          product.units_per_box,
          1
        );

        return [
          product.product_id,
          {
            boxes: Math.floor(
              product.reference_quantity / unitsPerBox
            ),
            loose:
              product.reference_quantity % unitsPerBox,
          },
        ];
      })
    )
  );

  const [state, action, pending] = useActionState(
    confirmOpeningStockAction,
    initialState
  );

  const reviewStep = products.length;
  const currentProduct = products[step];

  const totals = useMemo(() => {
    return products.reduce(
      (result, product) => {
        const count = counts[product.product_id];

        const quantity =
          (count?.boxes ?? 0) * product.units_per_box +
          (count?.loose ?? 0);

        result.units += quantity;

        result.value +=
          quantity * Number(product.selling_price);

        if (quantity !== product.reference_quantity) {
          result.differences += 1;
        }

        return result;
      },
      {
        units: 0,
        value: 0,
        differences: 0,
      }
    );
  }, [counts, products]);

  const payload = useMemo(() => {
    return JSON.stringify(
      products.map((product) => {
        const count = counts[product.product_id];

        return {
          product_id: product.product_id,

          reference_quantity:
            product.reference_quantity,

          confirmed_quantity:
            (count?.boxes ?? 0) *
              product.units_per_box +
            (count?.loose ?? 0),
        };
      })
    );
  }, [counts, products]);

  useEffect(() => {
    if (!state.success) return;

    router.push("/app/inventory");
    router.refresh();
  }, [state.success, router]);

  if (alreadyImported) {
    return (
      <AlreadyImported importedAt={importedAt} />
    );
  }

  if (products.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p>No active products were found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[980px] px-4 py-6 sm:px-6 sm:py-9">
      <Link
        href="/app/inventory"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Inventory
      </Link>

      <div className="mt-6">
        <p className="text-sm text-muted-foreground">
          Initial setup
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[30px]">
          Confirm opening stock
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          We&apos;ve pre-filled quantities from the July
          workbook. Count what is physically available and
          correct anything that differs.
        </p>
      </div>

      <div className="mt-7">
        <Progress
          current={
            step === reviewStep
              ? products.length
              : step
          }
          total={products.length}
          reviewing={step === reviewStep}
        />
      </div>

      {step < reviewStep ? (
        <ProductCount
          product={currentProduct}
          count={counts[currentProduct.product_id]}
          position={step + 1}
          total={products.length}
          onChange={(next) => {
            setCounts((previous) => ({
              ...previous,
              [currentProduct.product_id]: next,
            }));
          }}
          onBack={() =>
            setStep((current) =>
              Math.max(0, current - 1)
            )
          }
          onNext={() =>
            setStep((current) =>
              Math.min(reviewStep, current + 1)
            )
          }
        />
      ) : (
        <form action={action}>
          <input
            type="hidden"
            name="items"
            value={payload}
          />

          <Review
            products={products}
            counts={counts}
            totalUnits={totals.units}
            totalValue={totals.value}
            differences={totals.differences}
            pending={pending}
            error={state.error}
            onBack={() =>
              setStep(products.length - 1)
            }
            onEdit={(index) => setStep(index)}
          />
        </form>
      )}
    </main>
  );
}

function ProductCount({
  product,
  count,
  position,
  total,
  onChange,
  onBack,
  onNext,
}: {
  product: Product;
  count: Count;
  position: number;
  total: number;
  onChange: (count: Count) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const confirmed =
    count.boxes * product.units_per_box +
    count.loose;

  const difference =
    confirmed - product.reference_quantity;

  const value =
    confirmed * Number(product.selling_price);

  const matches = difference === 0;

  function updateBoxes(value: string) {
    const boxes = Math.max(
      0,
      Number.parseInt(value || "0", 10) || 0
    );

    onChange({
      ...count,
      boxes,
    });
  }

  function updateLoose(value: string) {
    const loose = Math.max(
      0,
      Number.parseInt(value || "0", 10) || 0
    );

    onChange({
      ...count,
      loose,
    });
  }

  function reset() {
    onChange({
      boxes: Math.floor(
        product.reference_quantity /
          product.units_per_box
      ),

      loose:
        product.reference_quantity %
        product.units_per_box,
    });
  }

  return (
    <section className="mt-6 overflow-hidden app-panel shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b px-5 py-5 sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">
              Material {position} of {total}
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em]">
              {product.name}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {product.units_per_box.toLocaleString(
                "en-GH"
              )}{" "}
              units per full box
            </p>
          </div>

          <div className="rounded-xl bg-[#f4f6f4] px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Unit price
            </p>

            <p className="mt-0.5 text-sm font-semibold">
              {money(product.selling_price)}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="rounded-2xl bg-blue-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium">
                July workbook reference
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Use this as a guide. The physical count is
                what will enter the new system.
              </p>
            </div>

            <p className="text-lg font-semibold tabular-nums">
              {product.reference_quantity.toLocaleString(
                "en-GH"
              )}{" "}
              units
            </p>
          </div>
        </div>

        <div className="mt-7">
          <p className="text-sm font-medium">
            What did you physically count?
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <NumberField
              label="Full boxes"
              value={count.boxes}
              hint={`${product.units_per_box} units each`}
              onChange={updateBoxes}
            />

            <NumberField
              label="Loose units"
              value={count.loose}
              hint="Units outside full boxes"
              onChange={updateLoose}
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border p-4 sm:p-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <Result
              label="Confirmed quantity"
              value={`${confirmed.toLocaleString(
                "en-GH"
              )} units`}
            />

            <Result
              label="Stock value"
              value={money(value)}
            />

            <Result
              label="Difference"
              value={
                matches
                  ? "Matches"
                  : `${difference > 0 ? "+" : ""}${difference.toLocaleString(
                      "en-GH"
                    )}`
              }
              attention={!matches}
            />
          </div>

          {!matches ? (
            <div className="mt-4 flex gap-2 rounded-xl bg-[#fff7e8] p-3 text-[#76521d]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />

              <p className="text-xs leading-5">
                Your physical count differs from the
                workbook by{" "}
                <strong>
                  {Math.abs(difference).toLocaleString(
                    "en-GH"
                  )}{" "}
                  units
                </strong>
                . That&apos;s okay if the physical count is
                correct.
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={reset}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reset to workbook
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-t bg-blue-50/40 px-5 py-4 sm:px-7">
        <Button
          type="button"
          variant="ghost"
          disabled={position === 1}
          onClick={onBack}
          className="rounded-xl"
        >
          <ChevronLeft className="mr-1 size-4" />
          Back
        </Button>

        <Button
          type="button"
          onClick={onNext}
          className="rounded-xl bg-[#1652c8] px-5 hover:bg-[#0f3f9e]"
        >
          {position === total
            ? "Review stock"
            : "Save & next"}

          <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    </section>
  );
}

function Review({
  products,
  counts,
  totalUnits,
  totalValue,
  differences,
  pending,
  error,
  onBack,
  onEdit,
}: {
  products: Product[];
  counts: Record<string, Count>;
  totalUnits: number;
  totalValue: number;
  differences: number;
  pending: boolean;
  error?: string;
  onBack: () => void;
  onEdit: (index: number) => void;
}) {
  return (
    <section className="mt-6">
      <div className="app-panel p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f1ff] text-[#315c3d]">
            <PackageCheck className="size-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold">
              Review opening inventory
            </h2>

            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              Check these numbers carefully. They become the
              starting point for future sales, deliveries and
              stock counts.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Summary
            label="Opening units"
            value={totalUnits.toLocaleString("en-GH")}
          />

          <Summary
            label="Retail value"
            value={money(totalValue)}
          />

          <Summary
            label="Different from workbook"
            value={String(differences)}
            attention={differences > 0}
          />
        </div>

        <div className="mt-7 overflow-hidden rounded-2xl border">
          {products.map((product, index) => {
            const count = counts[product.product_id];

            const quantity =
              count.boxes * product.units_per_box +
              count.loose;

            const different =
              quantity !== product.reference_quantity;

            return (
              <button
                key={product.product_id}
                type="button"
                onClick={() => onEdit(index)}
                className="flex w-full items-center justify-between gap-4 border-b px-4 py-3.5 text-left transition last:border-b-0 hover:bg-blue-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {product.name}
                    </p>

                    {different ? (
                      <span className="rounded-full bg-[#fff1d8] px-1.5 py-0.5 text-[9px] font-medium text-[#80591b]">
                        Changed
                      </span>
                    ) : (
                      <Check className="size-3.5 text-[#4c7958]" />
                    )}
                  </div>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Workbook{" "}
                    {product.reference_quantity.toLocaleString(
                      "en-GH"
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {quantity.toLocaleString("en-GH")}
                  </p>

                  <p className="text-[10px] text-muted-foreground">
                    units
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 space-y-2">
          <label
            htmlFor="notes"
            className="text-sm font-medium"
          >
            Migration note{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </label>

          <Textarea
            id="notes"
            name="notes"
            disabled={pending}
            placeholder="For example: Physical count completed with the store supervisor."
            className="min-h-24 resize-none"
          />
        </div>

        <div className="mt-5 flex gap-3 rounded-2xl bg-[#f4f7f4] p-4">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#3e6248]" />

          <p className="text-xs leading-5 text-muted-foreground">
            Confirming creates the opening inventory ledger
            and records who performed the migration. It
            cannot be imported a second time accidentally.
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={pending}
            className="rounded-xl"
          >
            <ChevronLeft className="mr-1 size-4" />
            Back
          </Button>

          <Button
            type="submit"
            disabled={pending}
            className="h-11 rounded-xl bg-[#1652c8] px-6 hover:bg-[#0f3f9e]"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating opening inventory...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 size-4" />
                Confirm opening inventory
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  hint: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="app-card p-4 transition focus-within:border-[#7aa2ef] focus-within:ring-2 focus-within:ring-[#d9e7ff]">
      <span className="text-xs font-medium">
        {label}
      </span>

      <input
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full bg-transparent text-3xl font-semibold tracking-[-0.04em] outline-none"
      />

      <span className="mt-1 block text-[11px] text-muted-foreground">
        {hint}
      </span>
    </label>
  );
}

function Result({
  label,
  value,
  attention = false,
}: {
  label: string;
  value: string;
  attention?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>

      <p
        className={
          attention
            ? "mt-1 text-sm font-semibold text-[#895e18]"
            : "mt-1 text-sm font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}

function Summary({
  label,
  value,
  attention = false,
}: {
  label: string;
  value: string;
  attention?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-blue-50/70 p-4">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p
        className={
          attention
            ? "mt-1.5 text-xl font-semibold tracking-[-0.03em] text-[#895e18]"
            : "mt-1.5 text-xl font-semibold tracking-[-0.03em]"
        }
      >
        {value}
      </p>
    </div>
  );
}

function Progress({
  current,
  total,
  reviewing,
}: {
  current: number;
  total: number;
  reviewing: boolean;
}) {
  const percentage = reviewing
    ? 100
    : Math.round((current / total) * 100);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium">
          {reviewing
            ? "Final review"
            : `${current + 1} of ${total}`}
        </span>

        <span className="text-muted-foreground">
          {percentage}%
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-[#e6e9e6]">
        <div
          className="h-full rounded-full bg-[#31553c] transition-all duration-300"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function AlreadyImported({
  importedAt,
}: {
  importedAt: string | null;
}) {
  const date = importedAt
    ? new Intl.DateTimeFormat("en-GH", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Africa/Accra",
      }).format(new Date(importedAt))
    : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="app-panel p-7 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
          <CheckCircle2 className="size-6" />
        </div>

        <h1 className="mt-4 text-xl font-semibold">
          Opening stock is already set
        </h1>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          This location already has its starting inventory
          recorded
          {date ? ` from ${date}` : ""}. Future changes
          should be recorded as deliveries, sales or stock
          adjustments.
        </p>

        <Link
          href="/app/inventory"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-xl app-primary px-5 text-sm font-medium"
        >
          View inventory
          <ArrowRight className="ml-2 size-4" />
        </Link>
      </div>
    </main>
  );
}

function money(value: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(Number(value));
}
