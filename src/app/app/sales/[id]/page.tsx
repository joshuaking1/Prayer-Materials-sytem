import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ReceiptText,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { ReceiptActions } from "./receipt-actions";

type ReceiptItem = {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type Receipt = {
  id: string;
  sale_number: string;
  created_at: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  payment_reference: string | null;
  status: string;

  staff: {
    id: string;
    name: string | null;
    username: string | null;
  };

  location: {
    id: string;
    name: string;
  };

  items: ReceiptItem[];
};

export default async function SaleReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * IMPORTANT:
   * The RPC already joins:
   *
   * sales
   * sale_items
   * products
   * profiles
   * locations
   *
   * We do NOT need another inventory_products query.
   */
  const { data, error } = await supabase.rpc(
    "get_sale_receipt",
    {
      p_sale_id: id,
    }
  );

  if (error) {
    console.error("RECEIPT LOAD ERROR", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  const receipt = data as Receipt;

  return (
    <main className="mx-auto max-w-[920px] px-4 py-6 sm:px-6 sm:py-9">
      <div className="print:hidden">
        <Link
          href="/app/sales"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Sales
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-4 print:mt-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#e8f1ff] text-[#315c3d] print:hidden">
            <ReceiptText className="size-[18px]" />
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              Sale receipt
            </p>

            <h1 className="mt-0.5 text-xl font-semibold tracking-[-0.025em]">
              {receipt.sale_number}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
            <CheckCircle2 className="size-3.5" />
            {receipt.status === "completed"
              ? "Completed"
              : receipt.status}
          </span>

          <div className="print:hidden">
            <ReceiptActions saleId={receipt.id} status={receipt.status} />
          </div>
        </div>
      </div>

      <section
        id="sale-receipt"
        className="mx-auto mt-6 w-full max-w-[360px] overflow-hidden rounded-lg border border-slate-200 bg-white p-4 font-mono text-[12px] leading-tight text-slate-950 shadow-[0_24px_70px_rgba(15,47,107,0.12)] print:mt-0 print:w-[80mm] print:max-w-none print:rounded-none print:border-0 print:p-[3mm] print:text-[12px] print:leading-snug print:shadow-none"
      >
        <div className="text-center">
          <p className="text-[15px] font-bold uppercase print:text-[15px]">
            Prayer Materials
          </p>
          <p className="mt-1 text-[11px] uppercase print:text-[11px]">
            {receipt.location?.name ?? "Location"}
          </p>
          <p className="mt-2 text-[10px] print:text-[10px]">
            Official Sales Receipt
          </p>
        </div>

        <ReceiptDivider />

        <div className="space-y-1">
          <ReceiptLine label="Receipt" value={receipt.sale_number} />
          <ReceiptLine label="Date" value={formatDate(receipt.created_at)} />
          <ReceiptLine
            label="Staff"
            value={
              receipt.staff?.name ||
              receipt.staff?.username ||
              "Staff"
            }
          />
          <ReceiptLine label="Payment" value={paymentName(receipt.payment_method)} />
          {receipt.payment_reference ? (
            <ReceiptLine label="Ref" value={receipt.payment_reference} />
          ) : null}
          <ReceiptLine
            label="Status"
            value={receipt.status === "completed" ? "Completed" : receipt.status}
          />
        </div>

        <ReceiptDivider />

        <div className="grid grid-cols-[1fr_36px_70px] gap-2 text-[10px] font-bold uppercase print:grid-cols-[1fr_34px_68px] print:gap-1 print:text-[10px]">
          <span>Item</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Amount</span>
        </div>

        <ReceiptDivider tight />

        <div className="space-y-2">
          {receipt.items.map((item) => (
            <div key={item.id}>
              <div className="grid grid-cols-[1fr_36px_70px] gap-2 print:grid-cols-[1fr_34px_68px] print:gap-1">
                <span className="break-words font-medium">
                  {item.name}
                </span>
                <span className="text-right tabular-nums">
                  {item.quantity.toLocaleString("en-GH")}
                </span>
                <span className="text-right tabular-nums">
                  {moneyCompact(item.line_total)}
                </span>
              </div>
              <p className="mt-0.5 pl-1 text-[10px] text-slate-600 print:text-[10px]">
                {item.quantity.toLocaleString("en-GH")} x {moneyCompact(item.unit_price)}
              </p>
            </div>
          ))}
        </div>

        <ReceiptDivider />

        <div className="space-y-1">
          <ReceiptLine label="Subtotal" value={moneyCompact(receipt.subtotal)} />
          {Number(receipt.discount) > 0 ? (
            <ReceiptLine label="Discount" value={`-${moneyCompact(receipt.discount)}`} />
          ) : null}
          <div className="flex items-baseline justify-between gap-3 border-y border-dashed border-slate-500 py-2 font-bold">
            <span className="uppercase">Total</span>
            <span className="text-[16px] tabular-nums print:text-[15px]">
              {moneyCompact(receipt.total)}
            </span>
          </div>
        </div>

        <div className="pt-3 text-center">
          <p className="font-bold uppercase">
            Thank you
          </p>
          <p className="mt-1 text-[10px] text-slate-600 print:text-[10px]">
            Keep this receipt for your records.
          </p>
          <p className="mt-2 break-all text-[9px] text-slate-500 print:text-[9px]">
            Sale ID: {receipt.id}
          </p>
        </div>
      </section>

      <div className="mt-5 flex flex-col gap-2 print:hidden sm:flex-row sm:justify-between">
        <Link
          href="/app/sales"
          className="inline-flex h-10 items-center justify-center rounded-xl border bg-white px-4 text-sm font-medium transition hover:bg-blue-50"
        >
          View all sales
        </Link>

        <Link
          href="/app/sales/new"
          className="inline-flex h-10 items-center justify-center rounded-xl app-primary px-5 text-sm font-medium"
        >
          Record another sale
        </Link>
      </div>
    </main>
  );
}

function ReceiptLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="shrink-0 uppercase text-slate-600">
        {label}
      </span>
      <span className="break-words text-right font-medium">
        {value}
      </span>
    </div>
  );
}

function ReceiptDivider({
  tight = false,
}: {
  tight?: boolean;
}) {
  return (
    <div className={tight ? "my-2 border-t border-dashed border-slate-400" : "my-3 border-t border-dashed border-slate-500"} />
  );
}

function paymentName(method: string) {
  switch (method) {
    case "cash":
      return "Cash";

    case "mobile_money":
      return "Mobile Money";

    case "bank_transfer":
      return "Bank transfer";

    default:
      return "Other";
  }
}

function moneyCompact(value: number) {
  return `GHc${Number(value).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Accra",
  }).format(new Date(value));
}
