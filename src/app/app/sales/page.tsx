import Link from "next/link";
import {
  ArrowRight,
  ReceiptText,
  Search,
  ShoppingBag,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export default async function SalesPage() {
  const supabase = await createClient();

  const { data: sales, error } = await supabase
    .from("sales")
    .select(`
      id,
      sale_number,
      total,
      payment_method,
      status,
      created_at,
      profiles!sales_created_by_fkey (
        display_name
      )
    `)
    .order("created_at", {
      ascending: false,
    })
    .limit(30);

  if (error) {
    console.error("SALES LOAD ERROR", error);
  }

  const rows = sales ?? [];

  return (
    <main className="app-page">
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Transactions
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">
            Sales
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Record sales quickly and keep every transaction
            traceable.
          </p>
        </div>

        <Link
          href="/app/sales/new"
          className="inline-flex h-11 items-center justify-center rounded-xl app-primary px-5 text-sm font-medium"
        >
          <ShoppingBag className="mr-2 size-4" />
          Record sale
        </Link>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <input
          type="search"
          placeholder="Search sale number..."
          className="h-10 w-full rounded-xl border border-blue-100 bg-white pl-9 pr-3 text-sm outline-none"
        />
      </div>

      {rows.length === 0 ? (
        <EmptySales />
      ) : (
        <div className="overflow-hidden app-card">
          {rows.map((sale) => (
            <Link
              key={sale.id}
              href={`/app/sales/${sale.id}`}
              className="group flex items-center justify-between gap-4 border-b px-4 py-4 transition last:border-b-0 hover:bg-blue-50/70 sm:px-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <ReceiptText className="size-[18px]" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {sale.sale_number}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(sale.created_at)}
                    {" · "}
                    {formatPayment(
                      sale.payment_method
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {money(Number(sale.total))}
                  </p>

                  <p className="mt-1 text-[10px] capitalize text-muted-foreground">
                    {sale.status}
                  </p>
                </div>

                <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function EmptySales() {
  return (
    <div className="app-card px-6 py-16 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
        <ShoppingBag className="size-5" />
      </div>

      <p className="mt-4 text-sm font-medium">
        No sales recorded yet
      </p>

      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
        Your completed transactions will appear here.
      </p>

      <Link
        href="/app/sales/new"
        className="mt-5 inline-flex h-10 items-center justify-center rounded-xl app-primary px-4 text-sm font-medium"
      >
        Record first sale
      </Link>
    </div>
  );
}

function money(value: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPayment(method: string) {
  return method
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GH", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Accra",
  }).format(new Date(value));
}
