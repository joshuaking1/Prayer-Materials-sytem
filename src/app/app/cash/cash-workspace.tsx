"use client";

import { useActionState, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Landmark,
  Loader2,
  Minus,
  Plus,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  recordCashCountAction,
  recordCashTransferAction,
  type CashState,
} from "./actions";

const denominations = [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2];
const initialState: CashState = { success: false };

export function CashWorkspace({
  expectedCash,
  countedCash,
  transferredCash,
}: {
  expectedCash: number;
  countedCash: number;
  transferredCash: number;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [otherCoins, setOtherCoins] = useState(0);
  const [countState, countAction, countPending] = useActionState(
    recordCashCountAction,
    initialState
  );
  const [transferState, transferAction, transferPending] = useActionState(
    recordCashTransferAction,
    initialState
  );

  const total = useMemo(
    () =>
      denominations.reduce(
        (sum, denomination) =>
          sum + denomination * (counts[String(denomination)] ?? 0),
        otherCoins
      ),
    [counts, otherCoins]
  );

  const difference = total - expectedCash;
  const payload = JSON.stringify(
    denominations.map((denomination) => ({
      denomination,
      count: counts[String(denomination)] ?? 0,
    }))
  );

  return (
    <main className="app-page">
      <div className="mb-7">
        <p className="text-sm text-muted-foreground">Money on site</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">
          Cash
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Count physical cash, compare it with expected cash, and record transfers.
        </p>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Metric label="Expected cash" value={money(expectedCash)} />
        <Metric label="Last counted" value={money(countedCash)} />
        <Metric label="Transferred" value={money(transferredCash)} />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <form action={countAction} className="app-panel p-5">
          <input type="hidden" name="denominations" value={payload} />

          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Banknote className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">Count cash</h2>
              <p className="text-xs text-muted-foreground">
                Enter the number of each note or coin physically present.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {denominations.map((denomination) => (
              <CashRow
                key={denomination}
                denomination={denomination}
                count={counts[String(denomination)] ?? 0}
                onChange={(count) =>
                  setCounts((previous) => ({
                    ...previous,
                    [String(denomination)]: count,
                  }))
                }
              />
            ))}
          </div>

          <label className="mt-4 block text-xs font-medium">
            Other coins
            <input
              name="other_coins"
              type="number"
              min="0"
              step="0.01"
              value={otherCoins}
              onChange={(event) => setOtherCoins(Number(event.target.value) || 0)}
              className="mt-2 h-11 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <label className="mt-4 block text-xs font-medium">
            Count note
            <textarea
              name="notes"
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          {countState.error ? (
            <Alert>{countState.error}</Alert>
          ) : countState.success ? (
            <Success>Cash count recorded.</Success>
          ) : null}

          <Button
            type="submit"
            disabled={countPending}
            className="mt-5 h-12 w-full rounded-xl app-primary"
          >
            {countPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Recording count...
              </>
            ) : (
              "Record cash count"
            )}
          </Button>
        </form>

        <aside className="space-y-5 lg:sticky lg:top-[92px] lg:h-fit">
          <div className="app-panel p-5">
            <h2 className="font-semibold">Cash reconciliation</h2>
            <div className="mt-5 space-y-3">
              <SummaryRow label="Expected" value={money(expectedCash)} />
              <SummaryRow label="Counted now" value={money(total)} />
              <SummaryRow
                label="Difference"
                value={money(difference)}
                attention={difference !== 0}
              />
            </div>
            <div className="mt-5 rounded-2xl bg-blue-50/70 p-4">
              <p className="text-3xl font-semibold tracking-[-0.04em] tabular-nums">
                {money(total)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Total cash counted</p>
            </div>
          </div>

          <form action={transferAction} className="app-panel p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Send className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Cash transfer</h2>
                <p className="text-xs text-muted-foreground">
                  Record money sent away from this location.
                </p>
              </div>
            </div>

            <TransferField label="Amount" name="amount" type="number" required />
            <TransferField label="Transferred to" name="destination" required />
            <label className="mt-3 block text-xs font-medium">
              Method
              <select
                name="method"
                required
                className="mt-2 h-11 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="other">Other</option>
              </select>
            </label>
            <TransferField label="Reference" name="reference" />
            <TransferField
              label="Date"
              name="transfer_date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />

            {transferState.error ? (
              <Alert>{transferState.error}</Alert>
            ) : transferState.success ? (
              <Success>Cash transfer recorded.</Success>
            ) : null}

            <Button
              type="submit"
              disabled={transferPending}
              className="mt-5 h-11 w-full rounded-xl app-primary"
            >
              {transferPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Recording transfer...
                </>
              ) : (
                <>
                  <Landmark className="mr-2 size-4" />
                  Record transfer
                </>
              )}
            </Button>
          </form>
        </aside>
      </div>
    </main>
  );
}

function CashRow({
  denomination,
  count,
  onChange,
}: {
  denomination: number;
  count: number;
  onChange: (count: number) => void;
}) {
  return (
    <div className="rounded-2xl border bg-blue-50/40 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">GH₵{denomination}</span>
        <span className="text-sm font-semibold tabular-nums">
          {money(denomination * count)}
        </span>
      </div>
      <div className="mt-3 flex items-center">
        <button
          type="button"
          disabled={count <= 0}
          onClick={() => onChange(count - 1)}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-white disabled:opacity-30"
          aria-label={`Decrease GH₵${denomination}`}
        >
          <Minus className="size-4" />
        </button>
        <input
          type="number"
          min="0"
          step="1"
          value={count}
          onChange={(event) =>
            onChange(Math.max(0, Number.parseInt(event.target.value || "0", 10) || 0))
          }
          className="min-w-0 flex-1 bg-transparent text-center text-lg font-semibold tabular-nums outline-none"
          aria-label={`GH₵${denomination} count`}
        />
        <button
          type="button"
          onClick={() => onChange(count + 1)}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-white"
          aria-label={`Increase GH₵${denomination}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="app-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{value}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  attention = false,
}: {
  label: string;
  value: string;
  attention?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={attention ? "font-semibold text-[#9a3412]" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}

function TransferField({
  label,
  name,
  type = "text",
  defaultValue,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="mt-3 block text-xs font-medium">
      {label}
      <input
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 h-11 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs leading-5 text-destructive">
      {children}
    </div>
  );
}

function Success({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#b7cffd] bg-[#eff6ff] p-3 text-xs leading-5 text-blue-700">
      <CheckCircle2 className="size-4" />
      {children}
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
