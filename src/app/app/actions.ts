"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type OpenDayState = {
  success: boolean;
  error?: string;
};

export async function openDayAction(
  _previousState: OpenDayState,
  formData: FormData
): Promise<OpenDayState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const notes = String(formData.get("notes") ?? "").trim();

  const { data, error } = await supabase.rpc(
    "open_daily_session",
    {
      p_notes: notes || null,
    }
  );

  console.log("OPEN DAY RESULT", {
    success: !error,
    sessionId: data?.id ?? null,
    status: data?.status ?? null,
    error: error?.message ?? null,
    code: error?.code ?? null,
  });

  if (error) {
    if (error.message.includes("DAY_ALREADY_CLOSED")) {
      return {
        success: false,
        error: "Today's operations have already been closed.",
      };
    }

    if (error.message.includes("NO_LOCATION_ASSIGNED")) {
      return {
        success: false,
        error: "Your account isn't assigned to a location.",
      };
    }

    if (error.message.includes("PROFILE_NOT_FOUND")) {
      return {
        success: false,
        error: "Your staff profile couldn't be found.",
      };
    }

    if (error.message.includes("ACCOUNT_DISABLED")) {
      return {
        success: false,
        error: "Your account is currently disabled.",
      };
    }

    return {
      success: false,
      error: `Couldn't open today's operations: ${error.message}`,
    };
  }

  revalidatePath("/app");

  return {
    success: true,
  };
}
