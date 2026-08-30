"use client";

import { useActionState } from "react";
import { Loader2, Printer, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  requestSaleCancellationAction,
  type CancellationState,
} from "./actions";

const initialState: CancellationState = {
  success: false,
};

export function ReceiptActions({
  saleId,
  status,
}: {
  saleId: string;
  status: string;
}) {
  const [state, action, pending] = useActionState(
    requestSaleCancellationAction,
    initialState
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => window.print()}
        className="rounded-xl bg-white"
      >
        <Printer className="mr-2 size-4" />
        Print receipt
      </Button>

      {status === "completed" ? (
        <details className="relative">
          <summary className="inline-flex h-8 cursor-pointer list-none items-center justify-center rounded-xl border bg-white px-3 text-sm font-medium transition hover:bg-blue-50">
            <Undo2 className="mr-2 size-4" />
            Request cancel
          </summary>

          <form
            action={action}
            className="absolute right-0 z-20 mt-2 w-72 app-card p-4 shadow-xl"
          >
            <input type="hidden" name="sale_id" value={saleId} />
            <label className="block text-xs font-medium">
              Reason
              <textarea
                name="reason"
                rows={3}
                required
                className="mt-2 w-full resize-none rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            {state.error ? (
              <p className="mt-3 text-xs leading-5 text-destructive">
                {state.error}
              </p>
            ) : null}

            {state.success ? (
              <p className="mt-3 text-xs leading-5 text-blue-700">
                Request submitted for supervisor review.
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={pending}
              className="mt-3 h-10 w-full rounded-xl app-primary"
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Submit request"
              )}
            </Button>
          </form>
        </details>
      ) : null}
    </div>
  );
}
