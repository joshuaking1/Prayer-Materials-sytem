import { createClient } from "@/lib/supabase/server";

type Product = {
  id: string;
  name: string;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const month =
    url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
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
        .select(
          "product_id, movement_type, quantity_change, quantity_after, created_at"
        )
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

    return [
      product.name,
      opening,
      received,
      sold,
      closing,
      price,
      sold * price,
      closing * price,
    ];
  });

  const csv = [
    [
      "Material",
      "Opening Stock",
      "Materials Received",
      "Quantity Sold",
      "Closing Stock",
      "Unit Price",
      "Gross Sales",
      "Closing Stock Value",
    ],
    ...rows,
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="prayer-materials-${month}.csv"`,
    },
  });
}

function csvCell(value: string | number) {
  const text = String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}
