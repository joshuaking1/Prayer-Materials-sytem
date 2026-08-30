"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  FileClock,
  HandCoins,
  LayoutDashboard,
  PackageCheck,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Users,
  WalletCards,
} from "lucide-react";

import { cn } from "@/lib/utils";

const operations = [
  {
    label: "Dashboard",
    href: "/app",
    icon: LayoutDashboard,
  },
  {
    label: "Sales",
    href: "/app/sales",
    icon: ShoppingBag,
  },
  {
    label: "Inventory",
    href: "/app/inventory",
    icon: Boxes,
  },
  {
    label: "Deliveries",
    href: "/app/deliveries",
    icon: PackageCheck,
  },
  {
    label: "Consignment",
    href: "/app/consignment",
    icon: HandCoins,
  },
  {
    label: "Cash",
    href: "/app/cash",
    icon: WalletCards,
  },
];

const management = [
  {
    label: "Approvals",
    href: "/app/approvals",
    icon: ClipboardCheck,
  },
  {
    label: "Reports",
    href: "/app/reports",
    icon: BarChart3,
  },
  {
    label: "Daily closing",
    href: "/app/closing",
    icon: ReceiptText,
  },
  {
    label: "Audit history",
    href: "/app/audit",
    icon: FileClock,
  },
];

const administration = [
  {
    label: "Users",
    href: "/app/users",
    icon: Users,
  },
  {
    label: "Settings",
    href: "/app/settings",
    icon: Settings,
  },
];

type SidebarProps = {
  role: "staff" | "supervisor" | "administrator";
};

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh max-h-dvh min-h-dvh w-[268px] shrink-0 self-start overflow-hidden border-r border-blue-100 bg-white/92 shadow-[12px_0_40px_rgba(15,47,107,0.06)] backdrop-blur lg:flex lg:flex-col">
      <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-blue-100 px-5">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1652c8] to-[#0f2f6b] text-white shadow-lg shadow-blue-900/15">
          <Boxes className="size-[18px]" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-[-0.02em] text-slate-950">
            Prayer Materials
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            Operations
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-color:#bfdbfe_transparent] [scrollbar-width:thin]">
        <NavigationSection
          items={operations}
          pathname={pathname}
        />

        {role !== "staff" ? (
          <NavigationSection
            title="Management"
            items={management}
            pathname={pathname}
          />
        ) : null}

        {role === "administrator" ? (
          <NavigationSection
            title="Administration"
            items={administration}
            pathname={pathname}
          />
        ) : null}
      </div>

      <div className="shrink-0 border-t border-blue-100 p-3">
        <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-3 py-2.5 ring-1 ring-blue-100">
          <ShieldCheck className="size-4 text-blue-700" />
          <div>
            <p className="text-xs font-medium">
              Activity protected
            </p>
            <p className="text-[10px] text-muted-foreground">
              Important actions are recorded
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavigationSection({
  title,
  items,
  pathname,
}: {
  title?: string;
  items: typeof operations;
  pathname: string;
}) {
  return (
    <div className={title ? "mt-5" : ""}>
      {title ? (
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </p>
      ) : null}

      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;

          const active =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-9 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition",
                active
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-700/20"
                  : "text-slate-600 hover:bg-blue-50 hover:text-blue-800"
              )}
            >
              <Icon className="size-[17px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
