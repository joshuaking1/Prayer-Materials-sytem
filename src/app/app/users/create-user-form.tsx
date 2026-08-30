"use client";

import { useActionState } from "react";
import { Loader2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createUserAction } from "./actions";
import type { UserActionState } from "./actions";

type Location = {
  id: string;
  name: string;
};

const initialUserState: UserActionState = {
  success: false,
};

export function CreateUserForm({
  locations,
}: {
  locations: Location[];
}) {
  const [state, action, pending] = useActionState(
    createUserAction,
    initialUserState
  );

  return (
    <form action={action} className="app-card p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <UserPlus className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold">Create user account</h2>
          <p className="text-xs text-muted-foreground">
            Staff will sign in with username and password only.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" name="display_name" placeholder="e.g. Ama Mensah" />
        <Field label="Username" name="username" required placeholder="e.g. ama" />
        <Field label="Password" name="password" type="password" required />

        <label className="block text-xs font-medium">
          Role
          <select
            name="role"
            className="mt-2 h-11 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            defaultValue="staff"
          >
            <option value="staff">Staff</option>
            <option value="supervisor">Supervisor</option>
            <option value="administrator">Administrator</option>
          </select>
        </label>

        <label className="block text-xs font-medium sm:col-span-2">
          Location
          <select
            name="location_id"
            className="mt-2 h-11 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {state.error ? (
        <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
          User account created.
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="mt-5 h-11 w-full rounded-xl app-primary"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Creating...
          </>
        ) : (
          "Create user"
        )}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-medium">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}
