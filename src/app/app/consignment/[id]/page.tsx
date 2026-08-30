import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  HandCoins,
  Phone,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { SettleConsignmentForm } from "./settle-consignment-form";

function money(value: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(value);
}

type ConsignmentDetail = {
  id: string;
  issue_number: string;
  seller_name: string;
  seller_contact: string | null;
  status: string;
  notes: string | null;
  settlement_notes: string | null;
  issued_at: string;
  settled_at: string | null;
  issued_by_profile: {
    display_name: string | null;
    username: string | null;
  } | null;
  stock_issue_items: {
    id: string;
    product_id: string;
    units_per_box_snapshot: number;
    units_issued: number;
    units_sold: number;
    units_returned: number;
    selling_price_snapshot: number;
    products: {
      name: string;
      sku: string | null;
    } | null;
  }[];
};

export default async function ConsignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
      notes,
      settlement_notes,
      issued_at,
      settled_at,
      issued_by_profile:issued_by (
        display_name,
        username
      ),
      stock_issue_items (
        id,
        product_id,
        units_per_box_snapshot,
        units_issued,
        units_sold,
        units_returned,
        selling_price_snapshot,
        products (
          name,
          sku
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("CONSIGNMENT DETAIL LOAD ERROR", error);
    notFound();
  }

  const consignment = data as unknown as ConsignmentDetail;
  const isIssued = consignment.status === "issued";
  const items = consignment.stock_issue_items ?? [];

  const totalIssued = items.reduce(
    (total, item) => total + Number(item.units_issued),
    0
  );

  const totalSold = items.reduce(
    (total, item) => total + Number(item.units_sold),
    0
  );

  const totalReturned = items.reduce(
    (total, item) => total + Number(item.units_returned),
    0
  );

  const amountOwed = items.reduce(
    (total, item) =>
      total + Number(item.units_sold) * Number(item.selling_price_snapshot),
    0
  );

  return (
    <main className="app-page">
      <Link
        href="/app/consignment"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Consignment
      </Link>

      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.035em] sm:text-[30px]">
            {consignment.seller_name}
          </h1>

          {isIssued ? (
            <span className="rounded-full bg-[#fff3df] px-3 py-1 text-xs font-medium text-[#825916]">
              Stock out
            </span>
          ) : (
            <span className="rounded-full bg-[#edf5ef] px-3 py-1 text-xs font-medium text-[#376045]">
              Settled
            </span>
          )}
        </div>

        <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{consignment.issue_number}</span>

          {consignment.seller_contact ? (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="size-3.5" />
              {consignment.seller_contact}
            </span>
          ) : null}
        </p>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Units given out" value={totalIssued.toLocaleString("en-GH")} />
        <Metric label="Reported sold" value={totalSold.toLocaleString("en-GH")} />
        <Metric
          label="Back in stock"
          value={totalReturned.toLocaleString("en-GH")}
          highlight
        />
        <Metric label="Amount to give us" value={money(amountOwed)} />
      </section>

      <section className="mt-7 app-card p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <HandCoins className="size-5" />
          </div>

          <div>
            <h2 className="font-semibold">Materials given out</h2>
            <p className="text-xs text-muted-foreground">
              {items.length} materials · {consignment.issue_number}
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="rounded-2xl bg-blue-50/60 p-5 text-sm text-muted-foreground">
            No materials were recorded on this consignment.
          </p>
        ) : (
          <div className="divide-y">
            {items.map((item) => {
              const itemSold = Number(item.units_sold);
              const itemPrice = Number(item.selling_price_snapshot);
              const itemAmount = itemSold * itemPrice;
              return (
                <div key={item.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.products?.name ?? "Unknown material"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.units_issued.toLocaleString("en-GH")} given out
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                        Price / unit
                      </p>
                      <p className="mt-1 text-xs font-medium tabular-nums">
                        {money(itemPrice)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                        Sold
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">
                        {itemSold.toLocaleString("en-GH")}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                        Returned
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-[#2f8f5b]">
                        {item.units_returned.toLocaleString("en-GH")}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                        Amount due
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">
                        {money(itemAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {consignment.notes || consignment.settlement_notes ? (
          <div className="mt-5 rounded-2xl bg-blue-50/60 p-4 text-xs leading-5 text-muted-foreground">
            {consignment.notes ? (
              <p>
                <span className="font-medium text-slate-700">Note: </span>
                {consignment.notes}
              </p>
            ) : null}

            {consignment.settlement_notes ? (
              <p className={consignment.notes ? "mt-2" : ""}>
                <span className="font-medium text-slate-700">Settlement: </span>
                {consignment.settlement_notes}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      {isIssued ? (
        <SettleConsignmentForm
          consignmentId={consignment.id}
          items={items}
        />
      ) : (
        <div className="mt-5 flex items-center gap-2 rounded-2xl bg-[#edf5ef] p-4 text-sm text-[#376045]">
          <CheckCircle2 className="size-4" />
          This consignment is settled. The unsold stock is back in inventory.
        </div>
      )}
    </main>
  );
}

function Metric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="app-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          highlight
            ? "mt-2 text-2xl font-semibold tracking-[-0.035em] text-[#2f8f5b]"
            : "mt-2 text-2xl font-semibold tracking-[-0.035em]"
        }
      >
        {value}
      </p>
    </div>
  );
}