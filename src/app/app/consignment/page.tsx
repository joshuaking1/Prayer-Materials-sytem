import Link from "next/link";
import {
  ArrowRight,
  HandCoins,
  Phone,
  Plus,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type ConsignmentRow = {
  id: string;
  issue_number: string;
  seller_name: string;
  seller_contact: string | null;
  status: string;
  issued_at: string;
  settled_at: string | null;
  stock_issue_items: {
    units_issued: number;
    units_returned: number;
  }[];
};

export default async function ConsignmentPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stock_issues")
    .select(
      `
      id,
      issue_number,
      seller_name,
      seller_contact,
      status,
      issued_at,
      settled_at,
      stock_issue_items (
        units_issued,
        units_returned
      )
    `
    )
    .order("issued_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("CONSIGNMENT LOAD ERROR", error);
  }

  const rows = (data ?? []) as ConsignmentRow[];

  const activeCount = rows.filter(
    (row) => row.status === "issued"
  ).length;

  const unitsOut = rows
    .filter((row) => row.status === "issued")
    .reduce(
      (total, row) =>
        total +
        (row.stock_issue_items ?? []).reduce(
          (sum, item) => sum + Number(item.units_issued),
          0
        ),
      0
    );

  return (
    <main className="app-page">
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Stock on the move
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">
            Consignment
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Give stock to sellers to go and sell. Record who took it,
            then count what they brought back.
          </p>
        </div>

        <Link
          href="/app/consignment/new"
          className="inline-flex h-11 items-center justify-center rounded-xl app-primary px-5 text-sm font-medium"
        >
          <Plus className="mr-2 size-4" />
          Give out stock
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <Metric
          label="Sellers with stock"
          value={String(activeCount)}
        />

        <Metric
          label="Units out right now"
          value={unitsOut.toLocaleString("en-GH")}
        />
      </section>

      {rows.length === 0 ? (
        <EmptyConsignment />
      ) : (
        <div className="mt-7 overflow-hidden app-card">
          {rows.map((row) => {
            const totalUnits = (row.stock_issue_items ?? []).reduce(
              (total, item) => total + Number(item.units_issued),
              0
            );

            const returnedUnits = (row.stock_issue_items ?? []).reduce(
              (total, item) => total + Number(item.units_returned),
              0
            );

            return (
              <Link
                key={row.id}
                href={`/app/consignment/${row.id}`}
                className="group flex items-center justify-between gap-4 border-b px-4 py-4 transition last:border-b-0 hover:bg-blue-50/70 sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <HandCoins className="size-[18px]" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {row.seller_name}
                    </p>

                    <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      {row.seller_contact ? (
                        <>
                          <Phone className="size-3" />
                          {row.seller_contact}
                          {" · "}
                        </>
                      ) : null}
                      {row.issue_number}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {totalUnits.toLocaleString("en-GH")} units
                    </p>

                    <p className="mt-1 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                      <StatusBadge status={row.status} />
                      {row.status === "settled" && returnedUnits > 0
                        ? ` · ${returnedUnits.toLocaleString(
                            "en-GH"
                          )} returned`
                        : null}
                    </p>
                  </div>

                  <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="app-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  if (status === "issued") {
    return (
      <span className="rounded-full bg-[#fff3df] px-2 py-0.5 text-[10px] font-medium text-[#825916]">
        Out
      </span>
    );
  }

  return (
    <span className="rounded-full bg-[#edf5ef] px-2 py-0.5 text-[10px] font-medium text-[#376045]">
      Settled
    </span>
  );
}

function EmptyConsignment() {
  return (
    <div className="mt-7 app-card px-6 py-16 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
        <HandCoins className="size-5" />
      </div>

      <p className="mt-4 text-sm font-medium">
        No stock given out yet
      </p>

      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
        Give stock to a seller to take and sell. When they return,
        you will report what they sold and put the rest back.
      </p>

      <Link
        href="/app/consignment/new"
        className="mt-5 inline-flex h-10 items-center justify-center rounded-xl app-primary px-4 text-sm font-medium"
      >
        Give out first stock
      </Link>
    </div>
  );
}