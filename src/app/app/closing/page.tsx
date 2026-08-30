import { CheckCircle2, CircleAlert, ReceiptText } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { closeDayAction } from "./actions";

export default async function ClosingPage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase.rpc("get_current_daily_session");
  const session = sessions?.[0] ?? null;

  const [{ data: sales }, { data: counts }, { data: cashCounts }, { data: discrepancies }] =
    await Promise.all([
      supabase.from("sales").select("total").eq("session_id", session?.id ?? ""),
      supabase.from("stock_counts").select("id").eq("session_id", session?.id ?? ""),
      supabase.from("cash_counts").select("actual_cash, difference").eq("session_id", session?.id ?? "").order("created_at", { ascending: false }).limit(1),
      supabase.from("stock_discrepancies").select("id").eq("session_id", session?.id ?? "").eq("status", "pending"),
    ]);

  const salesTotal = (sales ?? []).reduce(
    (total, sale) => total + Number(sale.total),
    0
  );

  const latestCash = cashCounts?.[0];
  const canClose =
    Boolean(session) &&
    (counts ?? []).length > 0 &&
    Boolean(latestCash);

  return (
    <main className="app-page max-w-[900px]">
      <div className="mb-7">
        <p className="text-sm text-muted-foreground">End of day</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">
          Daily closing
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Review sales, stock count, cash count and unresolved issues before closing.
        </p>
      </div>

      <section className="app-panel p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <ReceiptText className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">Closing readiness</h2>
            <p className="text-xs text-muted-foreground">
              {session ? "Today’s session is open" : "No open session"}
            </p>
          </div>
        </div>

        <div className="mt-5 divide-y">
          <Row label="Sales reviewed" complete={(sales ?? []).length > 0} value={money(salesTotal)} />
          <Row label="Stock counted" complete={(counts ?? []).length > 0} value={`${counts?.length ?? 0} submitted`} />
          <Row label="Cash counted" complete={Boolean(latestCash)} value={latestCash ? money(Number(latestCash.actual_cash)) : "Not counted"} />
          <Row label="Unresolved stock differences" complete={(discrepancies ?? []).length === 0} value={`${discrepancies?.length ?? 0} pending`} />
        </div>

        <form action={closeDayAction} className="mt-6 border-t pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium">
              Closing note
              <textarea
                name="notes"
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="block text-xs font-medium">
              Exception reason
              <textarea
                name="exception_reason"
                rows={3}
                placeholder="Required if closing with unresolved issues"
                className="mt-2 w-full resize-none rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>

          <Button
            type="submit"
            disabled={!canClose}
            className="mt-5 h-11 rounded-xl bg-[#1652c8] px-5 hover:bg-[#0f3f9e]"
          >
            Close today
          </Button>

          {!canClose ? (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Stock count and cash count are required before closing.
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}

function Row({
  label,
  complete,
  value,
}: {
  label: string;
  complete: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-3">
        <div
          className={
            complete
              ? "flex size-7 items-center justify-center rounded-full bg-blue-50 text-blue-700"
              : "flex size-7 items-center justify-center rounded-full bg-[#fff3df] text-[#825916]"
          }
        >
          {complete ? <CheckCircle2 className="size-4" /> : <CircleAlert className="size-4" />}
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{value}</span>
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
