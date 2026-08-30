import { redirect } from "next/navigation";
import {
  Boxes,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

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
      <section className="relative hidden overflow-hidden bg-[#0f2f6b] px-12 py-10 text-white lg:flex lg:flex-col xl:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(96,165,250,0.55),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(14,165,233,0.34),transparent_34%)]" />
        <div className="absolute inset-0 opacity-[0.10]">
          <div className="absolute -left-24 -top-24 size-[420px] rounded-full border border-white" />
          <div className="absolute bottom-[-180px] right-[-100px] size-[520px] rounded-full border border-white" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15 shadow-xl shadow-blue-950/20">
            <Boxes className="size-5" />
          </div>

          <div>
            <p className="font-semibold tracking-[-0.02em]">
              Prayer Materials
            </p>
            <p className="text-xs text-white/55">
              Operations & accountability
            </p>
          </div>
        </div>

        <div className="relative my-auto max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-blue-50 ring-1 ring-white/15">
            <Sparkles className="size-3.5" />
            Simpler daily operations
          </div>

          <h1 className="max-w-lg text-5xl font-semibold leading-[1.02] tracking-[-0.045em] xl:text-6xl">
            Stock and cash,
            <br />
            without the spreadsheet.
          </h1>

          <p className="mt-6 max-w-md text-[15px] leading-7 text-blue-50/70">
            Record what happened. The system handles the calculations,
            history, reconciliation and reporting.
          </p>

          <div className="mt-10 grid max-w-lg gap-3">
            <Feature>
              Every stock change can be explained
            </Feature>

            <Feature>
              Cash differences are visible, never hidden
            </Feature>

            <Feature>
              Daily work stays simple for staff
            </Feature>
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-white/45">
          <ShieldCheck className="size-4" />
          Secure access · Activity recorded
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
                <p className="font-semibold">Prayer Materials</p>
                <p className="text-xs text-muted-foreground">
                  Operations & accountability
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

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm text-blue-50/75">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10">
        <CheckCircle2 className="size-3.5" />
      </div>

      {children}
    </div>
  );
}
