"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  resetSystemAction,
  type ResetState,
} from "./actions";

const initialResetState: ResetState = {
  success: false,
};

export function ResetSystemCard() {
  const router = useRouter();

  const [confirmation, setConfirmation] = useState("");
  const [state, action, pending] = useActionState(
    resetSystemAction,
    initialResetState
  );

  const confirmed = confirmation.trim().toUpperCase() === "RESET";

  useEffect(() => {
    if (state.success && state.resetComplete) {
      const timeout = setTimeout(() => {
        router.refresh();
      }, 600);

      return () => clearTimeout(timeout);
    }
  }, [state.success, state.resetComplete, router]);

  return (
    <section className="mt-5 app-card border-[#ffd2cc] p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#ffebe8] text-[#b3402a]">
          <AlertTriangle className="size-5" />
        </div>

        <div>
          <h2 className="font-semibold">Reset the system</h2>
          <p className="text-xs text-muted-foreground">
            Wipe every transaction, stock entry and product to start fresh from
            a clean demonstration.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-[#fff7f5] p-4 text-xs leading-5 text-muted-foreground">
        <p className="font-medium text-[#b3402a]">
          This cannot be undone.
        </p>
        <p className="mt-1.5">
          Everything goes back to zero: sales, deliveries, stock counts, cash,
          consignments, audit history, inventory balances and the product
          catalogue. Your administrator account stays, so you can log in and
          set the system up for real.
        </p>
      </div>

      <Dialog>
        <DialogTrigger
          render={
            <Button
              className="mt-5 h-11 rounded-xl border-destructive/30 bg-destructive/10 px-5 text-destructive hover:bg-destructive/20"
              variant="outline"
            />
          }
        >
          <RefreshCcw className="size-4" />
          Reset everything
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset the whole system?</DialogTitle>
            <DialogDescription>
              All sales, stock, deliveries, cash, consignments, reports and
              audit records will be permanently deleted. Only your admin
              account will survive.
            </DialogDescription>
          </DialogHeader>

          <form action={action} className="space-y-4">
            <div>
              <label htmlFor="reset-confirmation" className="text-xs font-medium">
                Type <span className="font-bold tracking-wide">RESET</span> to confirm
              </label>

              <input
                id="reset-confirmation"
                name="confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                autoFocus
                className="mt-2 h-11 w-full rounded-xl border border-[#ffd2cc] bg-white px-3 text-sm uppercase tracking-widest outline-none transition focus:border-[#e58a77] focus:ring-4 focus:ring-[#ffe8e3]"
              />
            </div>

            {pending && !state.success ? (
              <p className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-700">
                <Loader2 className="size-4 animate-spin" />
                Resetting the system...
              </p>
            ) : state.error ? (
              <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                {state.error}
              </p>
            ) : state.success && state.resetComplete ? (
              <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
                System reset complete. Everything is clean and ready for real
                use.
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="submit"
                disabled={!confirmed || pending}
                className="h-11 rounded-xl bg-red-600 px-5 text-white hover:bg-red-700"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "I understand, reset everything"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}