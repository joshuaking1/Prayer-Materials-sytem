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
  ArrowLeft,
  Banknote,
  Check,
  ChevronRight,
  CreditCard,
  Landmark,
  Loader2,
  Minus,
  PackageOpen,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  WalletCards,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  recordSaleAction,
  type SaleState,
} from "./actions";

import type { SaleProduct } from "./page";

type Cart = Record<string, number>;

const initialState: SaleState = {
  success: false,
};

export function NewSale({
  products,
}: {
  products: SaleProduct[];
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Cart>({});
  const [paymentMethod, setPaymentMethod] =
    useState("cash");

  const [idempotencyKey] = useState(() =>
    crypto.randomUUID()
  );

  const [state, action, pending] = useActionState(
    recordSaleAction,
    initialState
  );

  const filteredProducts = useMemo(() => {
    const normalized = query
      .trim()
      .toLowerCase();

    if (!normalized) {
      return products;
    }

    return products.filter((product) =>
      [
        product.name,
        product.short_name,
        product.sku,
        product.category,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(normalized)
        )
    );
  }, [products, query]);

  const cartItems = useMemo(() => {
    return products
      .filter(
        (product) =>
          (cart[product.product_id] ?? 0) > 0
      )
      .map((product) => ({
        ...product,
        quantity:
          cart[product.product_id],
      }));
  }, [cart, products]);

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) =>
          total +
          item.quantity *
            Number(item.selling_price),
        0
      ),
    [cartItems]
  );

  const totalUnits = useMemo(
    () =>
      cartItems.reduce(
        (total, item) =>
          total + item.quantity,
        0
      ),
    [cartItems]
  );

  const payload = useMemo(
    () =>
      JSON.stringify(
        cartItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        }))
      ),
    [cartItems]
  );

  useEffect(() => {
    if (
      !state.success ||
      !state.saleId
    ) {
      return;
    }

    router.push(
      `/app/sales/${state.saleId}`
    );
  }, [state.success, state.saleId, router]);

  function add(product: SaleProduct) {
    if (product.current_quantity <= 0) {
      return;
    }

    setCart((previous) => {
      const current =
        previous[product.product_id] ?? 0;

      if (
        current >=
        product.current_quantity
      ) {
        return previous;
      }

      return {
        ...previous,
        [product.product_id]:
          current + 1,
      };
    });
  }

  function changeQuantity(
    product: SaleProduct,
    quantity: number
  ) {
    const safeQuantity = Math.max(
      0,
      Math.min(
        quantity,
        product.current_quantity
      )
    );

    setCart((previous) => {
      const next = { ...previous };

      if (safeQuantity === 0) {
        delete next[product.product_id];
      } else {
        next[product.product_id] =
          safeQuantity;
      }

      return next;
    });
  }

  return (
    <main className="min-h-[calc(100dvh-72px)]">
      <div className="mx-auto max-w-[1380px] px-4 py-5 sm:px-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <Link
              href="/app/sales"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Sales
            </Link>

            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
              Record sale
            </h1>
          </div>

          <div className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 sm:block">
            ● Day open
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
          <section>
            <div className="sticky top-[72px] z-20 -mx-1 bg-[#f5f8ff]/95 px-1 pb-4 pt-1 backdrop-blur">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />

                <input
                  value={query}
                  onChange={(event) =>
                    setQuery(
                      event.target.value
                    )
                  }
                  type="search"
                  autoFocus
                  placeholder="Search prayer materials..."
                  className="h-12 w-full app-card pl-11 pr-4 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            {filteredProducts.length ===
            0 ? (
              <div className="app-card px-5 py-14 text-center">
                <PackageOpen className="mx-auto size-6 text-muted-foreground" />

                <p className="mt-3 text-sm font-medium">
                  No materials found
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Try another product name.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map(
                  (product) => (
                    <ProductCard
                      key={
                        product.product_id
                      }
                      product={product}
                      quantity={
                        cart[
                          product.product_id
                        ] ?? 0
                      }
                      onAdd={() =>
                        add(product)
                      }
                    />
                  )
                )}
              </div>
            )}
          </section>

          <aside className="lg:sticky lg:top-[92px] lg:h-fit">
            <form
              action={action}
              className="overflow-hidden app-panel shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
            >
              <input
                type="hidden"
                name="items"
                value={payload}
              />

              <input
                type="hidden"
                name="payment_method"
                value={paymentMethod}
              />

              <input
                type="hidden"
                name="idempotency_key"
                value={idempotencyKey}
              />

              <div className="border-b px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">
                      Current sale
                    </h2>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {totalUnits}{" "}
                      {totalUnits === 1
                        ? "unit"
                        : "units"}
                    </p>
                  </div>

                  <ShoppingBag className="size-5 text-muted-foreground" />
                </div>
              </div>

              {cartItems.length === 0 ? (
                <EmptyCart />
              ) : (
                <div className="max-h-[340px] overflow-y-auto">
                  {cartItems.map(
                    (item) => (
                      <CartItem
                        key={
                          item.product_id
                        }
                        item={item}
                        onChange={(
                          quantity
                        ) =>
                          changeQuantity(
                            item,
                            quantity
                          )
                        }
                      />
                    )
                  )}
                </div>
              )}

              <div className="border-t p-5">
                <p className="mb-3 text-xs font-medium">
                  Payment
                </p>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <PaymentButton
                    icon={Banknote}
                    label="Cash"
                    value="cash"
                    selected={
                      paymentMethod ===
                      "cash"
                    }
                    onClick={() =>
                      setPaymentMethod(
                        "cash"
                      )
                    }
                  />

                  <PaymentButton
                    icon={WalletCards}
                    label="MoMo"
                    value="mobile_money"
                    selected={
                      paymentMethod ===
                      "mobile_money"
                    }
                    onClick={() =>
                      setPaymentMethod(
                        "mobile_money"
                      )
                    }
                  />

                  <PaymentButton
                    icon={Landmark}
                    label="Bank"
                    value="bank_transfer"
                    selected={
                      paymentMethod ===
                      "bank_transfer"
                    }
                    onClick={() =>
                      setPaymentMethod(
                        "bank_transfer"
                      )
                    }
                  />

                  <PaymentButton
                    icon={CreditCard}
                    label="Other"
                    value="other"
                    selected={
                      paymentMethod ===
                      "other"
                    }
                    onClick={() =>
                      setPaymentMethod(
                        "other"
                      )
                    }
                  />
                </div>

                {paymentMethod !==
                "cash" ? (
                  <div className="mt-3">
                    <label className="text-xs font-medium">
                      Payment reference{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </label>

                    <input
                      name="payment_reference"
                      placeholder={
                        paymentMethod ===
                        "mobile_money"
                          ? "MoMo transaction ID"
                          : paymentMethod ===
                                "bank_transfer"
                            ? "Bank transaction reference"
                            : "Payment reference"
                      }
                      className="mt-2 h-10 w-full rounded-xl border px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                ) : null}

                <div className="mt-4">
                  <label
                    htmlFor="sale-notes"
                    className="text-xs font-medium"
                  >
                    Sale note{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </label>

                  <textarea
                    id="sale-notes"
                    name="notes"
                    rows={2}
                    disabled={pending}
                    placeholder="Add a short note if needed..."
                    className="mt-2 w-full resize-none rounded-xl border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="mt-5 space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Subtotal
                    </span>

                    <span className="tabular-nums">
                      {money(subtotal)}
                    </span>
                  </div>

                  <div className="flex items-end justify-between pt-1">
                    <span className="font-medium">
                      Total
                    </span>

                    <span className="text-2xl font-semibold tracking-[-0.04em] tabular-nums">
                      {money(subtotal)}
                    </span>
                  </div>
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
                  disabled={
                    pending ||
                    cartItems.length === 0
                  }
                  className="mt-5 h-12 w-full rounded-xl app-primary text-sm"
                >
                  {pending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Completing sale...
                    </>
                  ) : (
                    <>
                      Complete sale
                      <ChevronRight className="ml-1 size-4" />
                    </>
                  )}
                </Button>

                <p className="mt-3 text-center text-[10px] leading-4 text-muted-foreground">
                  Stock is deducted only after
                  the transaction succeeds.
                </p>
              </div>
            </form>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ProductCard({
  product,
  quantity,
  onAdd,
}: {
  product: SaleProduct;
  quantity: number;
  onAdd: () => void;
}) {
  const soldOut =
    product.current_quantity <= 0;

  const maxed =
    quantity >=
    product.current_quantity;

  const lowStock =
    product.current_quantity > 0 &&
    product.current_quantity <=
      Math.max(product.units_per_box, 10);

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={soldOut || maxed}
      className="group min-h-40 app-card p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition enabled:hover:-translate-y-0.5 enabled:hover:border-[#9dbcf7] enabled:hover:shadow-md disabled:cursor-not-allowed disabled:opacity-55"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          {quantity > 0 ? (
            <Check className="size-4" />
          ) : (
            <ShoppingBag className="size-4" />
          )}
        </div>

        {quantity > 0 ? (
          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
            {quantity} in sale
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <p className="font-medium tracking-[-0.015em]">
          {product.name}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {money(
            Number(
              product.selling_price
            )
          )}{" "}
          each
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p
          className={
            soldOut
              ? "text-xs font-medium text-destructive"
              : lowStock
                ? "text-xs font-medium text-[#9a681c]"
                : "text-xs text-muted-foreground"
          }
        >
          {soldOut
            ? "Out of stock"
            : lowStock
              ? `Low · ${product.current_quantity.toLocaleString(
                  "en-GH"
                )} left`
              : `${product.current_quantity.toLocaleString(
                  "en-GH"
                )} available`}
        </p>

        {!soldOut && !maxed ? (
          <Plus className="size-4 text-muted-foreground transition group-hover:text-foreground" />
        ) : null}
      </div>
    </button>
  );
}

function CartItem({
  item,
  onChange,
}: {
  item: SaleProduct & {
    quantity: number;
  };
  onChange: (quantity: number) => void;
}) {
  const unitsPerBox = Math.max(
    Number(item.units_per_box) || 1,
    1
  );

  const boxes = Math.floor(
    item.quantity / unitsPerBox
  );

  const loose =
    item.quantity % unitsPerBox;

  const canUseBoxes =
    unitsPerBox > 1;

  function updateBoxes(value: number) {
    const safeBoxes = Math.max(0, value);

    const requested =
      safeBoxes * unitsPerBox + loose;

    onChange(requested);
  }

  function updateLoose(value: number) {
    const safeLoose = Math.max(
      0,
      Math.min(
        value,
        unitsPerBox - 1
      )
    );

    const requested =
      boxes * unitsPerBox + safeLoose;

    onChange(requested);
  }

  return (
    <div className="border-b px-5 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {item.name}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {money(
              Number(item.selling_price)
            )}{" "}
            per unit
          </p>
        </div>

        <p className="text-sm font-semibold tabular-nums">
          {money(
            item.quantity *
              Number(item.selling_price)
          )}
        </p>
      </div>

      {canUseBoxes ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <QuantityField
            label="Boxes"
            value={boxes}
            hint={`${unitsPerBox.toLocaleString(
              "en-GH"
            )} each`}
            onChange={updateBoxes}
          />

          <QuantityField
            label="Loose"
            value={loose}
            hint="individual units"
            onChange={updateLoose}
          />
        </div>
      ) : (
        <div className="mt-4">
          <QuantityField
            label="Quantity"
            value={item.quantity}
            hint="units"
            onChange={onChange}
          />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            Selling
          </p>

          <p className="mt-0.5 text-xs font-medium">
            {item.quantity.toLocaleString(
              "en-GH"
            )}{" "}
            units
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            Available
          </p>

          <p className="mt-0.5 text-xs font-medium">
            {item.current_quantity.toLocaleString(
              "en-GH"
            )}{" "}
            units
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange(0)}
        className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
        Remove
      </button>
    </div>
  );
}

function QuantityField({
  label,
  value,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  hint: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-xl border bg-blue-50/40 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground">
          {label}
        </span>

        <span className="text-[9px] text-muted-foreground">
          {hint}
        </span>
      </div>

      <div className="mt-2 flex items-center">
        <button
          type="button"
          disabled={value <= 0}
          onClick={() =>
            onChange(value - 1)
          }
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-white transition hover:bg-blue-50 disabled:opacity-30"
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
              Math.max(
                0,
                Number.parseInt(
                  event.target.value || "0",
                  10
                ) || 0
              )
            )
          }
          className="min-w-0 flex-1 bg-transparent text-center text-lg font-semibold tabular-nums outline-none"
          aria-label={label}
        />

        <button
          type="button"
          onClick={() =>
            onChange(value + 1)
          }
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-white transition hover:bg-blue-50"
          aria-label={`Increase ${label}`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function PaymentButton({
  icon: Icon,
  label,
  selected,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        selected
          ? "flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[#7aa2ef] bg-[#e8f1ff] text-[#173c7d]"
          : "flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-xl border bg-white text-muted-foreground transition hover:bg-blue-50"
      }
    >
      <Icon className="size-4" />
      <span className="text-[11px] font-medium">
        {label}
      </span>
    </button>
  );
}

function EmptyCart() {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-[#eff6ff]">
        <ShoppingBag className="size-4 text-muted-foreground" />
      </div>

      <p className="mt-3 text-sm font-medium">
        Sale is empty
      </p>

      <p className="mt-1 max-w-52 text-xs leading-5 text-muted-foreground">
        Select a prayer material to
        add it here.
      </p>
    </div>
  );
}

function money(value: number) {
  return new Intl.NumberFormat(
    "en-GH",
    {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }
  ).format(Number(value));
}
