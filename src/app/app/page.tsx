import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Boxes,
  CheckCircle2,
  PackageCheck,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { OpenDay } from "./open-day";

export default async function AppPage() {
  const supabase = await createClient();

  const { data: sessions, error } = await supabase.rpc(
    "get_current_daily_session"
  );

  if (error) {
    console.error("SESSION LOAD ERROR", error);
  }

  const session = sessions?.[0] ?? null;

  const dayIsOpen =
    session?.status === "open" ||
    session?.status === "reopened";

  const [
    { data: sales },
    { data: cashTransfers },
    { data: stockCounts },
    { data: cashCounts },
    { data: discrepancies },
  ] = session
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
        supabase.from("stock_counts").select("id").eq("session_id", session.id),
        supabase
          .from("cash_counts")
          .select("id, actual_cash")
          .eq("session_id", session.id)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("stock_discrepancies")
          .select("id")
          .eq("session_id", session.id)
          .eq("status", "pending"),
      ])
    : [
        { data: [] },
        { data: null },
        { data: [] },
        { data: [] },
        { data: [] },
      ];

  const todaySales = (sales ?? []).reduce(
    (total, sale) => total + Number(sale.total),
    0
  );

  const transferredCash = (cashTransfers ?? []).reduce(
    (total, transfer) => total + Number(transfer.amount),
    0
  );

  const expectedCash = todaySales - transferredCash;
  const countedCash = Number(cashCounts?.[0]?.actual_cash ?? 0);
  const stockCountDone = (stockCounts ?? []).length > 0;
  const cashCountDone = (cashCounts ?? []).length > 0;
  const issueCount = (discrepancies ?? []).length;

  return (
    <main className="app-page">
      <div className="mb-7">
        <p className="text-sm font-medium text-blue-700">
          Today&apos;s operations
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-[30px]">
            Main Office
          </h1>

          {dayIsOpen ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f0ff] px-2.5 py-1 text-[11px] font-medium text-[#1750a6]">
              <span className="size-1.5 rounded-full bg-[#2563eb]" />
              Day open
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef2f7] px-2.5 py-1 text-[11px] font-medium text-[#64748b]">
              Day not open
            </span>
          )}
        </div>
      </div>

      {!dayIsOpen ? (
        <OpenDay />
      ) : (
        <OpenSessionOverview
          openedAt={session.opened_at}
          salesTotal={todaySales}
          expectedCash={expectedCash}
          countedCash={countedCash}
          issueCount={issueCount}
        />
      )}

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="font-semibold tracking-[-0.02em]">
            Quick actions
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Record what is happening today.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction
            icon={ShoppingBag}
            title="Record sale"
            description="Sell one or more materials"
            href="/app/sales/new"
            enabled={dayIsOpen}
          />

          <QuickAction
            icon={PackageCheck}
            title="Receive materials"
            description="Record an incoming delivery"
            href="/app/deliveries/new"
            enabled={dayIsOpen}
          />

          <QuickAction
            icon={Boxes}
            title="Count stock"
            description="Enter what you physically counted"
            href="/app/inventory/count"
            enabled={dayIsOpen}
          />

          <QuickAction
            icon={Banknote}
            title="Count cash"
            description="Count notes and coins"
            href="/app/cash"
            enabled={dayIsOpen}
          />
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="app-card p-5">
          <h2 className="font-semibold">
            Today&apos;s closing readiness
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ll tell you what still needs attention.
          </p>

          <div className="mt-5 divide-y">
            <ReadinessRow
              label="Operational session"
              complete={dayIsOpen}
              value={dayIsOpen ? "Open" : "Required"}
            />

            <ReadinessRow
              label="Full stock count"
              complete={stockCountDone}
              value={stockCountDone ? "Submitted" : "Not completed"}
            />

            <ReadinessRow
              label="Final cash count"
              complete={cashCountDone}
              value={cashCountDone ? "Submitted" : "Not completed"}
            />

            <ReadinessRow
              label="Unresolved issues"
              complete={issueCount === 0}
              value={issueCount === 0 ? "None" : `${issueCount} pending`}
            />
          </div>
        </div>

        <div className="app-card p-5">
          <h2 className="font-semibold">
            Needs attention
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Issues that may block closing appear here.
          </p>

          <div className="mt-7 flex min-h-32 flex-col items-center justify-center text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              <CheckCircle2 className="size-5" />
            </div>

            <p className="mt-3 text-sm font-medium">
              {issueCount === 0 ? "Nothing needs attention" : `${issueCount} issue${issueCount === 1 ? "" : "s"} need review`}
            </p>

            <p className="mt-1 max-w-52 text-xs leading-5 text-muted-foreground">
              Stock differences, cash issues and approvals will
              appear here.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function OpenSessionOverview({
  openedAt,
  salesTotal,
  expectedCash,
  countedCash,
  issueCount,
}: {
  openedAt: string;
  salesTotal: number;
  expectedCash: number;
  countedCash: number;
  issueCount: number;
}) {
  const time = new Intl.DateTimeFormat("en-GH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Accra",
  }).format(new Date(openedAt));

  return (
    <section className="relative overflow-hidden rounded-[30px] bg-[#0f2f6b] p-5 text-white shadow-2xl shadow-blue-950/20 sm:p-7">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(96,165,250,0.55),transparent_28%),radial-gradient(circle_at_85%_80%,rgba(14,165,233,0.26),transparent_32%)]" />
      <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-white/55">
            <span className="size-2 rounded-full bg-[#60a5fa]" />
            Operations open
          </div>

          <p className="mt-5 text-[13px] text-white/55">
            Sales today
          </p>

          <p className="mt-1 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            {money(salesTotal)}
          </p>

          <p className="mt-2 text-xs text-white/45">
            Opened at {time}
          </p>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-3 xl:min-w-[420px]">
          <MiniMetric label="Expected cash" value={money(expectedCash)} />
          <MiniMetric label="Cash counted" value={money(countedCash)} />
          <MiniMetric label="Stock issues" value={String(issueCount)} />
        </div>

        <Link
          href="/app/sales/new"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-[#0f2f6b] shadow-lg shadow-blue-950/15 transition hover:bg-blue-50"
        >
          Record a sale
          <ArrowRight className="ml-2 size-4" />
        </Link>
      </div>
    </section>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3">
      <p className="text-[11px] text-white/55">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  href,
  enabled,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  enabled: boolean;
}) {
  const className =
    "group flex min-h-36 items-start justify-between app-card p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_24px_60px_rgba(15,47,107,0.12)]";

  if (!enabled) {
    return (
      <button
        type="button"
        disabled
        className="flex min-h-36 cursor-not-allowed items-start justify-between app-card p-4 text-left opacity-45"
      >
        <QuickActionContent
          icon={Icon}
          title={title}
          description={description}
        />
      </button>
    );
  }

  return (
    <Link
      href={href}
      className={className}
    >
      <QuickActionContent
        icon={Icon}
        title={title}
        description={description}
      />

      <ArrowRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

function QuickActionContent({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="mb-5 flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 transition group-hover:bg-blue-600 group-hover:text-white">
        <Icon className="size-[17px]" />
      </div>

      <p className="text-sm font-semibold text-slate-950">{title}</p>

      <p className="mt-1 max-w-44 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function ReadinessRow({
  label,
  complete,
  value,
}: {
  label: string;
  complete: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <div
          className={
            complete
              ? "flex size-7 items-center justify-center rounded-full bg-blue-50 text-blue-700"
              : "flex size-7 items-center justify-center rounded-full bg-[#eef2f7] text-[#64748b]"
          }
        >
          {complete ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <AlertCircle className="size-4" />
          )}
        </div>

        <span className="text-sm font-medium">{label}</span>
      </div>

      <span className="text-xs text-muted-foreground">
        {value}
      </span>
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
