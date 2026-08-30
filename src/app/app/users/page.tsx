import { Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { CreateUserForm } from "./create-user-form";

export default async function UsersPage() {
  const supabase = await createClient();

  const [{ data }, { data: locations }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        `
      id,
      username,
      display_name,
      role,
      phone,
      is_active,
      last_login_at,
      locations (
        name
      )
    `
      )
      .order("display_name"),
    supabase.from("locations").select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <main className="app-page">
      <div className="mb-7">
        <p className="text-sm text-muted-foreground">Administration</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">
          Users
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Staff, supervisors and administrators who can use the system.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <CreateUserForm locations={locations ?? []} />

        <div className="overflow-hidden app-card">
          {(data ?? []).length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Users className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-4 text-sm font-medium">No users found</p>
            </div>
          ) : (
            (data ?? []).map((user) => {
              const location = Array.isArray(user.locations)
                ? user.locations[0]
                : user.locations;

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-4 border-b px-4 py-4 last:border-b-0 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {user.display_name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      @{user.username} · {location?.name ?? "No location"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium capitalize">{user.role}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {user.is_active ? "Active" : "Disabled"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
