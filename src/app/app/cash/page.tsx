import { createClient } from "@/lib/supabase/server";
import { CashWorkspace } from "./cash-workspace";

export default async function CashPage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase.rpc(
    "get_current_daily_session"
  );

  const session = sessions?.[0] ?? null;

  const { data, error } = await supabase.rpc("get_cash_overview");

  if (error) {
    console.error("CASH OVERVIEW LOAD ERROR", error);
  }

  const overview = Array.isArray(data) ? data[0] : data;

  const [{ data: sales }, { data: transfers }] = session
    ? await Promise.all([
        supabase
          .from("sales")
          .select("total")
          .eq("session_id", session.id)
          .eq("status", "completed"),
        supabase
          .from("cash_transfers")
          .select("amount")
          .eq("session_id", session.id)
          .in("status", ["recorded", "approved"]),
      ])
    : [{ data: [] }, { data: [] }];

  const salesTotal = (sales ?? []).reduce(
    (total, sale) => total + Number(sale.total),
    0
  );

  const transferredTotal = (transfers ?? []).reduce(
    (total, transfer) => total + Number(transfer.amount),
    0
  );

  return (
    <CashWorkspace
      expectedCash={salesTotal - transferredTotal}
      countedCash={Number(overview?.counted_cash ?? 0)}
      transferredCash={transferredTotal}
    />
  );
}
