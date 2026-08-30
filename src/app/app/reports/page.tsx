import Link from "next/link";
import { BarChart3, Download } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  month?: string;
};

type Product = {
  id: string;
  name: string;
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const month = params.month ?? new Date().toISOString().slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));

  const [{ data: products }, { data: movements }, { data: prices }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name")
        .eq("is_active", true)
        .order("display_order"),
      supabase
        .from("inventory_movements")
        .select("product_id, movement_type, quantity_change, quantity_after, created_at")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString()),
      supabase
        .from("product_prices")
        .select("product_id, selling_price, effective_from")
        .lte("effective_from", end.toISOString())
        .order("effective_from", { ascending: false }),
    ]);

  const priceByProduct = new Map<string, number>();
  for (const price of prices ?? []) {
    if (!priceByProduct.has(price.product_id)) {
      priceByProduct.set(price.product_id, Number(price.selling_price));
    }
  }

  const rows = ((products ?? []) as Product[]).map((product) => {
    const productMovements = (movements ?? []).filter(
      (movement) => movement.product_id === product.id
    );

    const received = productMovements
      .filter((movement) => movement.movement_type === "received")
      .reduce((total, movement) => total + Number(movement.quantity_change), 0);

    const sold = Math.abs(
      productMovements
        .filter((movement) => movement.movement_type === "sale")
        .reduce((total, movement) => total + Number(movement.quantity_change), 0)
    );

    const lastMovement = [...productMovements].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    const closing = Number(lastMovement?.quantity_after ?? 0);
    const opening = closing - received + sold;
    const price = priceByProduct.get(product.id) ?? 0;

    return {
      product,
      opening,
      received,
      sold,
      closing,
      price,
      sales: sold * price,
      closingValue: closing * price,
    };
  });

  const totals = rows.reduce(
    (sum, row) => ({
      received: sum.received + row.received,
      sold: sum.sold + row.sold,
      closing: sum.closing + row.closing,
      sales: sum.sales + row.sales,
      closingValue: sum.closingValue + row.closingValue,
    }),
    { received: 0, sold: 0, closing: 0, sales: 0, closingValue: 0 }
  );

  return (
    <main className="app-page">
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Excel replacement</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">
            Monthly report
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Opening stock, received materials, quantity sold, closing stock and value.
          </p>
        </div>

        <form className="flex gap-2">
          <input
            type="month"
            name="month"
            defaultValue={month}
            className="h-10 rounded-xl border border-blue-100 bg-white px-3 text-sm outline-none"
          />
          <button className="inline-flex h-10 items-center justify-center rounded-xl app-primary px-4 text-sm font-medium">
            Generate
          </button>
        </form>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-4">
        <Metric label="Total sales" value={money(totals.sales)} />
        <Metric label="Units sold" value={totals.sold.toLocaleString("en-GH")} />
        <Metric label="Received" value={totals.received.toLocaleString("en-GH")} />
        <Metric label="Stock value" value={money(totals.closingValue)} />
      </section>

      <div className="overflow-x-auto app-card">
        <table className="min-w-[860px] w-full text-left text-sm">
          <thead className="border-b bg-blue-50/70 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Material</th>
              <th className="px-4 py-3 text-right font-medium">Opening</th>
              <th className="px-4 py-3 text-right font-medium">Received</th>
              <th className="px-4 py-3 text-right font-medium">Sold</th>
              <th className="px-4 py-3 text-right font-medium">Closing</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-right font-medium">Sales</th>
              <th className="px-4 py-3 text-right font-medium">Closing value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.product.id} className="border-b last:border-b-0">
                <td className="px-4 py-3 font-medium">{row.product.name}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.opening}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.received}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.sold}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.closing}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(row.price)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(row.sales)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(row.closingValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link
        href={`/app/reports/export.csv?month=${month}`}
        className="mt-5 inline-flex h-11 items-center justify-center rounded-xl border bg-white px-4 text-sm font-medium transition hover:bg-blue-50"
      >
        <Download className="mr-2 size-4" />
        Export Excel CSV
      </Link>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="app-card p-4">
      <BarChart3 className="size-4 text-muted-foreground" />
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-[-0.03em]">{value}</p>
    </div>
  );
}

function money(value: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(Number(value));
}
