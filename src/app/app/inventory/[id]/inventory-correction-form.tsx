"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  correctInventoryAction,
  type InventoryCorrectionState,
} from "./actions";

const initialState: InventoryCorrectionState = {
  success: false,
};

export function InventoryCorrectionForm({
  productId,
  currentQuantity,
}: {
  productId: string;
  currentQuantity: number;
}) {
  const [state, action, pending] = useActionState(
    correctInventoryAction,
    initialState
  );

  return (
    <form action={action} className="app-card p-5">
      <input type="hidden" name="product_id" value={productId} />

      <h2 className="font-semibold">Correct inventory</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Use this when a delivery, count or entry mistake made the product stock wrong.
      </p>

      <label className="mt-5 block text-xs font-medium">
        Correct total units
        <input
          name="correct_quantity"
          type="number"
          min="0"
          step="1"
          required
          defaultValue={currentQuantity}
          className="mt-2 h-11 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="mt-4 block text-xs font-medium">
        Reason
        <textarea
          name="reason"
          rows={3}
          required
          placeholder="Example: Delivery was entered with 10 extra units"
          className="mt-2 w-full resize-none rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      {state.error ? (
        <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs leading-5 text-destructive">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-700">
          Inventory corrected and recorded in stock movements.
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="mt-5 h-11 w-full rounded-xl app-primary"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving correction...
          </>
        ) : (
          <>
            <Save className="mr-2 size-4" />
            Save correction
          </>
        )}
      </Button>
    </form>
  );
}
