import Link from "next/link";
import { ArrowRight, PackageCheck, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export default async function DeliveriesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deliveries")
    .select(
      `
      id,
      invoice_number,
      invoice_date,
      supplier,
      status,
      created_at,
      delivery_items (
        total_units
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("DELIVERIES LOAD ERROR", error);
  }

  const rows = data ?? [];

  return (
    <main className="app-page">
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Received materials</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">
            Deliveries
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Keep invoice details and every material received under the same record.
          </p>
        </div>

        <Link
          href="/app/deliveries/new"
          className="inline-flex h-11 items-center justify-center rounded-xl app-primary px-5 text-sm font-medium"
        >
          <Plus className="mr-2 size-4" />
          Receive materials
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="app-card px-6 py-16 text-center">
          <PackageCheck className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium">No deliveries recorded yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
            Invoices and received materials will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden app-card">
          {rows.map((delivery) => {
            const totalUnits = (delivery.delivery_items ?? []).reduce(
              (total: number, item: { total_units: number | null }) =>
                total + Number(item.total_units ?? 0),
              0
            );

            return (
              <div
                key={delivery.id}
                className="flex items-center justify-between gap-4 border-b px-4 py-4 last:border-b-0 sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <PackageCheck className="size-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {delivery.invoice_number}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {delivery.invoice_date} · {delivery.supplier || "No supplier"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-sm font-semibold tabular-nums">
                      {totalUnits.toLocaleString("en-GH")} units
                    </p>
                    <p className="mt-1 text-[10px] capitalize text-muted-foreground">
                      {delivery.status}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
