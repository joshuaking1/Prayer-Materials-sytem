import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/app-shell/header";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { Sidebar } from "@/components/app-shell/sidebar";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      id,
      username,
      display_name,
      role,
      is_active,
      location_id,
      locations (
        id,
        name
      )
    `)
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    redirect("/login");
  }

  const location = Array.isArray(profile.locations)
    ? profile.locations[0]
    : profile.locations;

  return (
    <div className="flex min-h-dvh bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f5f8ff_34%,#f8fbff_100%)]">
      <Sidebar role={profile.role} />

      <div className="min-w-0 flex-1">
        <Header
          displayName={profile.display_name}
          role={profile.role}
          locationName={location?.name ?? "Main Office"}
        />

        <div className="pb-20 lg:pb-0">
          {children}
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
