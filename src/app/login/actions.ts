"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return {
      error: "Enter your username and password.",
    };
  }

  const admin = createAdminClient();

  const { data: loginIdentity, error: lookupError } = await admin
    .from("username_login_lookup")
    .select("internal_email, auth_user_id")
    .eq("username_normalized", username)
    .maybeSingle();

  if (lookupError || !loginIdentity) {
    return {
      error: "The username or password is incorrect.",
    };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("is_active")
    .eq("id", loginIdentity.auth_user_id)
    .maybeSingle();

  if (!profile?.is_active) {
    return {
      error: "This account is currently disabled.",
    };
  }
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: loginIdentity.internal_email,
    password,
  });


  if (error) {
    return {
      error: "The username or password is incorrect.",
    };
  }

  await admin
    .from("profiles")
    .update({
      last_login_at: new Date().toISOString(),
    })
    .eq("id", loginIdentity.auth_user_id);

  redirect("/app");
}
