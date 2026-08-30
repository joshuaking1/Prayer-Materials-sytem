import { ClipboardCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { approveSaleCancellationAction } from "./actions";

export default async function ApprovalsPage() {
  const supabase = await createClient();

  const { data: approvals } = await supabase
    .from("approvals")
    .select("id, entity_type, entity_id, action_type, status, request_reason, requested_at")
    .order("requested_at", { ascending: false })
    .limit(30);

  const { data: discrepancies } = await supabase
    .from("stock_discrepancies")
    .select(
      `
      id,
      expected_quantity,
      actual_quantity,
      difference,
      status,
      created_at,
      products (
        name
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <main className="app-page">
      <div className="mb-7">
        <p className="text-sm text-muted-foreground">Supervisor review</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">
          Approvals
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Review stock differences, corrections and other items that need approval.
        </p>
      </div>

      <section className="grid gap-5 lg:grid-cols-2">
        <Panel title="Stock differences">
          {(discrepancies ?? []).length === 0 ? (
            <Empty icon={ClipboardCheck} text="No stock differences waiting." />
          ) : (
            (discrepancies ?? []).map((item) => {
              const product = Array.isArray(item.products)
                ? item.products[0]
                : item.products;

              return (
                <div key={item.id} className="border-b py-4 last:border-b-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">
                        {product?.name ?? "Material"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Expected {item.expected_quantity} · Counted {item.actual_quantity}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#fff3df] px-2 py-1 text-[10px] font-medium text-[#825916]">
                      {item.difference}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </Panel>

        <Panel title="Approval requests">
          {(approvals ?? []).length === 0 ? (
            <Empty icon={ClipboardCheck} text="No approval requests yet." />
          ) : (
            (approvals ?? []).map((item) => (
              <div key={item.id} className="border-b py-4 last:border-b-0">
                <p className="text-sm font-medium">
                  {item.action_type.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.entity_type} · {item.status}
                </p>
                {item.action_type === "cancel_sale" && item.status === "pending" ? (
                  <form action={approveSaleCancellationAction} className="mt-3">
                    <input type="hidden" name="approval_id" value={item.id} />
                    <label className="block text-xs font-medium">
                      Review note
                      <textarea
                        name="notes"
                        rows={2}
                        className="mt-2 w-full resize-none rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      />
                    </label>
                    <Button
                      type="submit"
                      className="mt-3 h-9 rounded-xl bg-[#1652c8] px-4 hover:bg-[#0f3f9e]"
                    >
                      Approve cancellation
                    </Button>
                  </form>
                ) : null}
              </div>
            ))
          )}
        </Panel>
      </section>
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-card p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Empty({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="py-12 text-center">
      <Icon className="mx-auto size-6 text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
