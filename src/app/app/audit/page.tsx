import { FileClock } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export default async function AuditPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      `
      id,
      action,
      entity_type,
      reason,
      created_at,
      profiles:user_id (
        display_name
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("AUDIT LOAD ERROR", error);
  }

  const rows = data ?? [];

  return (
    <main className="app-page">
      <PageHeader
        eyebrow="Accountability"
        title="Audit history"
        description="Important financial, stock and setup actions are recorded here."
      />

      {rows.length === 0 ? (
        <EmptyState icon={FileClock} title="No audit events yet" />
      ) : (
        <div className="overflow-hidden app-card">
          {rows.map((row) => {
            const profile = Array.isArray(row.profiles)
              ? row.profiles[0]
              : row.profiles;

            return (
              <div
                key={row.id}
                className="flex items-start justify-between gap-4 border-b px-4 py-4 last:border-b-0 sm:px-5"
              >
                <div>
                  <p className="text-sm font-medium">
                    {humanize(row.action)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {profile?.display_name ?? "System"} · {row.entity_type}
                  </p>
                  {row.reason ? (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {row.reason}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 text-right text-xs text-muted-foreground">
                  {formatDate(row.created_at)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7">
      <p className="text-sm text-muted-foreground">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">
        {title}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="app-card px-6 py-16 text-center">
      <Icon className="mx-auto size-7 text-muted-foreground" />
      <p className="mt-4 text-sm font-medium">{title}</p>
    </div>
  );
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
