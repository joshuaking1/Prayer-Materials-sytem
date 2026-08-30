"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  FileClock,
  Home,
  LayoutDashboard,
  Menu,
  PackageCheck,
  ReceiptText,
  Settings,
  ShoppingBag,
  Users,
  WalletCards,
  X,
  HandCoins,
} from "lucide-react";

import { cn } from "@/lib/utils";

const quickItems = [
  {
    label: "Home",
    href: "/app",
    icon: Home,
  },
  {
    label: "Sales",
    href: "/app/sales",
    icon: ShoppingBag,
  },
  {
    label: "Stock",
    href: "/app/inventory",
    icon: Boxes,
  },
  {
    label: "Cash",
    href: "/app/cash",
    icon: WalletCards,
  },
];

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

type MobileNavProps = {
  role: "staff" | "supervisor" | "administrator";
};

export function MobileNav({ role }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/app"
      ? pathname === "/app"
      : pathname.startsWith(href);
  }

  function close() {
    setOpen(false);
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-blue-100 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_34px_rgba(15,47,107,0.08)] backdrop-blur lg:hidden">
        <nav className="mx-auto flex h-16 max-w-md items-center justify-around">
          {quickItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  "flex min-w-16 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-medium",
                  isActive(item.href)
                    ? "text-blue-700"
                    : "text-muted-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "size-5",
                    isActive(item.href) && "stroke-[2.3]"
                  )}
                />

                {item.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-w-16 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-medium text-muted-foreground"
            aria-label="Open more menu"
          >
            <Menu className="size-5" />
            More
          </button>
        </nav>
      </div>

      {open ? (
        <MobileMenu
          role={role}
          pathname={pathname}
          isActive={isActive}
          onClose={close}
        />
      ) : null}
    </>
  );
}

function MobileMenu({
  role,
  pathname,
  isActive,
  onClose,
}: {
  role: MobileNavProps["role"];
  pathname: string;
  isActive: (href: string) => boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="More menu"
    >
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[28px] border-t border-blue-100 bg-white pb-[max(env(safe-area-inset-bottom),1rem)] shadow-[0_-24px_60px_rgba(15,47,107,0.18)]">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between px-5 pb-3 pt-4">
            <div>
              <p className="text-sm font-semibold">All pages</p>
              <p className="text-[11px] text-muted-foreground">
                Jump anywhere in the app
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="flex size-9 items-center justify-center rounded-xl border border-blue-100 text-muted-foreground transition hover:bg-blue-50"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mx-5 h-px bg-blue-100" />
        </div>

        <div className="px-5 py-4">
          <MenuSection
            title="Operations"
            items={operations}
            pathname={pathname}
            isActive={isActive}
            onClose={onClose}
          />

          {role !== "staff" ? (
            <MenuSection
              title="Management"
              items={management}
              pathname={pathname}
              isActive={isActive}
              onClose={onClose}
            />
          ) : null}

          {role === "administrator" ? (
            <MenuSection
              title="Administration"
              items={administration}
              pathname={pathname}
              isActive={isActive}
              onClose={onClose}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MenuSection({
  title,
  items,
  pathname,
  isActive,
  onClose,
}: {
  title: string;
  items: typeof operations;
  pathname: string;
  isActive: (href: string) => boolean;
  onClose: () => void;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </p>

      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition",
              isActive(item.href)
                ? "bg-blue-600 text-white shadow-sm shadow-blue-700/20"
                : "text-slate-600 hover:bg-blue-50 hover:text-blue-800"
            )}
          >
            <Icon className="size-[17px]" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}