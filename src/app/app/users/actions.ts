"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type UserActionState = {
  success: boolean;
  error?: string;
};

export async function createUserAction(
  _previousState: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: actor } = await supabase
    .from("profiles")
    .select("role, location_id")
    .eq("id", user.id)
    .maybeSingle();

  if (actor?.role !== "administrator") {
    return {
      success: false,
      error: "Only administrators can create users.",
    };
  }

  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const role = String(formData.get("role") ?? "staff");
  const locationId =
    String(formData.get("location_id") ?? "").trim() || actor.location_id;

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return {
      success: false,
      error:
        "Username must be 3-32 characters using letters, numbers, dot, dash or underscore.",
    };
  }

  if (password.length < 6) {
    return {
      success: false,
      error: "Password must be at least 6 characters.",
    };
  }

  if (!["staff", "supervisor", "administrator"].includes(role)) {
    return {
      success: false,
      error: "Choose a valid role.",
    };
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("username_login_lookup")
    .select("auth_user_id")
    .eq("username_normalized", username)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error: "That username is already taken.",
    };
  }

  const internalEmail = `${username}.${crypto.randomUUID()}@prayer-materials.local`;

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        display_name: displayName || username,
      },
    });

  if (createError || !created.user) {
    return {
      success: false,
      error: `The user account could not be created: ${createError?.message ?? "Unknown error"}`,
    };
  }

  const userId = created.user.id;

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    username,
    display_name: displayName || username,
    role,
    location_id: locationId,
    is_active: true,
  });

  const { error: lookupError } = await admin
    .from("username_login_lookup")
    .insert({
      auth_user_id: userId,
      username_normalized: username,
      internal_email: internalEmail,
    });

  if (profileError || lookupError) {
    await admin.auth.admin.deleteUser(userId);

    return {
      success: false,
      error:
        profileError?.message ||
        lookupError?.message ||
        "The user profile could not be saved.",
    };
  }

  revalidatePath("/app/users");

  return {
    success: true,
  };
}
