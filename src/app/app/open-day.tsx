"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Loader2,
  LockKeyhole,
  SunMedium,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  openDayAction,
  type OpenDayState,
} from "./actions";

const initialState: OpenDayState = {
  success: false,
};

export function OpenDay() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [state, action, pending] = useActionState(
    openDayAction,
    initialState
  );

  useEffect(() => {
    if (!state.success) return;

    router.refresh();
  }, [state.success, router]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#dfe5e0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <SunMedium className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold tracking-[-0.02em]">
                Start today&apos;s operations
              </h2>

              <span className="rounded-full bg-[#f3f4f3] px-2 py-1 text-[10px] font-medium text-[#687069]">
                Not open
              </span>
            </div>

            <p className="mt-1.5 max-w-lg text-sm leading-6 text-muted-foreground">
              Open the day before recording sales, deliveries,
              stock counts or cash.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-blue-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="size-4 text-muted-foreground" />

            <div>
              <p className="text-xs font-medium">Today</p>

              <p className="text-xs text-muted-foreground">
                A new operational session will be created.
              </p>
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button className="h-10 rounded-xl bg-[#1652c8] px-4 hover:bg-[#0f3f9e]" />
              }
            >
                Open day
                <ArrowRight className="ml-2 size-4" />
            </DialogTrigger>

            <DialogContent className="sm:max-w-[440px]">
              <DialogHeader>
                <DialogTitle>
                  Open today&apos;s operations?
                </DialogTitle>

                <DialogDescription>
                  Once opened, staff can begin recording
                  operational activity for today.
                </DialogDescription>
              </DialogHeader>

              <form action={action} className="mt-2 space-y-5">
                <div className="rounded-xl border bg-[#f8f9f7] p-4">
                  <div className="flex gap-3">
                    <LockKeyhole className="mt-0.5 size-4 shrink-0 text-[#4e6354]" />

                    <p className="text-xs leading-5 text-muted-foreground">
                      Every sale, delivery, stock count and cash
                      count will be linked to this day.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">
                    Opening note{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>

                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Anything the team should know today?"
                    className="min-h-24 resize-none"
                    disabled={pending}
                  />
                </div>

                {state.error ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                  >
                    {state.error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={pending}
                  className="h-11 w-full rounded-xl app-primary"
                >
                  {pending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Opening today&apos;s operations...
                    </>
                  ) : (
                    "Open today's operations"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
