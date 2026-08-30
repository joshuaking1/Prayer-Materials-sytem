"use client";

import { useActionState } from "react";
import { Loader2, PackagePlus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createProductAction,
  updateProductAction,
} from "./actions";
import type { SettingsState } from "./actions";

export type EditableProduct = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  low_stock_threshold: number;
  is_active: boolean;
  selling_price: number;
  cost_price: number;
  units_per_box: number;
};

const initialSettingsState: SettingsState = {
  success: false,
};

export function AddProductForm() {
  const [state, action, pending] = useActionState(
    createProductAction,
    initialSettingsState
  );

  return (
    <form action={action} className="app-card p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <PackagePlus className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold">Add material</h2>
          <p className="text-xs text-muted-foreground">
            Create a new product for sales and inventory.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" name="name" required />
        <Field label="SKU" name="sku" />
        <Field label="Category" name="category" />
        <Field label="Selling price" name="selling_price" type="number" required />
        <Field label="Cost price" name="cost_price" type="number" />
        <Field label="Units per box" name="units_per_box" type="number" required />
        <Field
          label="Low stock threshold"
          name="low_stock_threshold"
          type="number"
        />
      </div>

      <Feedback state={state} success="Product added." />

      <Button
        type="submit"
        disabled={pending}
        className="mt-5 h-11 w-full rounded-xl app-primary"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Adding...
          </>
        ) : (
          "Add product"
        )}
      </Button>
    </form>
  );
}

export function ProductEditForm({
  product,
}: {
  product: EditableProduct;
}) {
  const [state, action, pending] = useActionState(
    updateProductAction,
    initialSettingsState
  );

  return (
    <form action={action} className="rounded-2xl border border-blue-100 bg-white p-4">
      <input type="hidden" name="product_id" value={product.id} />

      <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_0.7fr_0.7fr_0.7fr_auto]">
        <Field label="Material" name="name" defaultValue={product.name} required />
        <Field label="SKU" name="sku" defaultValue={product.sku ?? ""} />
        <Field
          label="Category"
          name="category"
          defaultValue={product.category ?? ""}
        />
        <Field
          label="Price"
          name="selling_price"
          type="number"
          defaultValue={String(product.selling_price)}
          required
        />
        <Field
          label="Cost"
          name="cost_price"
          type="number"
          defaultValue={String(product.cost_price)}
        />
        <Field
          label="Units/box"
          name="units_per_box"
          type="number"
          defaultValue={String(product.units_per_box)}
          required
        />
        <Field
          label="Low stock"
          name="low_stock_threshold"
          type="number"
          defaultValue={String(product.low_stock_threshold)}
        />

        <div className="flex items-end gap-2">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-blue-100 px-3 text-xs">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={product.is_active}
              className="size-4"
            />
            Active
          </label>
          <Button
            type="submit"
            size="icon"
            disabled={pending}
            className="h-11 w-11 rounded-xl app-primary"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            <span className="sr-only">Save product</span>
          </Button>
        </div>
      </div>

      <Feedback state={state} success="Product saved." />
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block text-xs font-medium">
      {label}
      <input
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        required={required}
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function Feedback({
  state,
  success,
}: {
  state: { success: boolean; error?: string };
  success: string;
}) {
  if (state.error) {
    return (
      <p className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
        {success}
      </p>
    );
  }

  return null;
}
