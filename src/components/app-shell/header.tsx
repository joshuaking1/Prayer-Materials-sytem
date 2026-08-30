import {
  Bell,
  Building2,
  ChevronDown,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type HeaderProps = {
  displayName: string;
  locationName: string;
  role: string;
};

export function Header({
  displayName,
  locationName,
  role,
}: HeaderProps) {
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between border-b border-blue-100 bg-white/86 px-4 shadow-sm shadow-blue-950/5 backdrop-blur-xl sm:px-6 lg:h-[76px]">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#1652c8] text-white lg:hidden">
          <Building2 className="size-4" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm font-semibold text-slate-950">
              {locationName}
            </p>

            <ChevronDown className="size-3.5 text-muted-foreground" />
          </div>

          <p className="truncate text-[11px] capitalize text-muted-foreground">
            {role}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="hidden rounded-xl sm:inline-flex"
        >
          <Search className="size-[18px]" />
          <span className="sr-only">Search</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl"
        >
          <Bell className="size-[18px]" />
          <span className="sr-only">Notifications</span>
        </Button>

        <div className="ml-1 flex items-center gap-2 rounded-xl py-1 pl-1 pr-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white shadow-sm shadow-blue-700/20">
            {initials}
          </div>

          <span className="hidden max-w-32 truncate text-xs font-medium sm:block">
            {displayName}
          </span>
        </div>
      </div>
    </header>
  );
}
