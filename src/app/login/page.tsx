import { redirect } from "next/navigation";
import { Boxes } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f5f8ff_42%,#ffffff_100%)] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
<section className="relative hidden overflow-hidden lg:block">
        <img
          src="/sidebar.jpg"
          alt="Believer Worship Center"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-black/40" />

        <div className="relative flex h-full flex-col items-center justify-center p-10 xl:p-12">
          <div className="w-full max-w-lg rounded-[24px] border border-white/15 bg-black/50 p-8 text-center backdrop-blur-sm xl:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/90">
              Adenta-Container
            </p>

            <h1 className="mt-5 text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] text-white xl:text-[44px]">
              Believer Worship Center
            </h1>

            <p className="mt-3 text-[15px] font-medium text-white/85">
              Prayer Materials System
            </p>

            <p className="mt-5 border-t border-white/20 pt-5 text-[13px] leading-7 text-white/70">
              Stock, cash and daily operations, accounted for in one place.
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[450px] rounded-[28px] border border-blue-100 bg-white/82 p-6 shadow-2xl shadow-blue-950/10 backdrop-blur sm:p-8 lg:border-none lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="mb-9 lg:hidden">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#1652c8] text-white">
                <Boxes className="size-5" />
              </div>

              <div>
                <p className="font-semibold">
                  Believer Worship Center
                </p>
                <p className="text-xs text-muted-foreground">
                  Prayer Materials System · Adenta-Corner
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-2 text-sm font-medium text-blue-700">
              Welcome back
            </p>

            <h2 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">
              Sign in to continue
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Use the username and password given to you by your
              administrator.
            </p>
          </div>

          <LoginForm />

          <div className="mt-8 border-t pt-5">
            <p className="text-center text-xs leading-5 text-muted-foreground">
              Having trouble signing in? Contact your administrator.
            </p>
          </div>
        </div>
      </section>
</main>
  );
}
