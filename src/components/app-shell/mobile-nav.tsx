"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Home,
  Menu,
  ShoppingBag,
  WalletCards,
} from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
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

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-blue-100 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_34px_rgba(15,47,107,0.08)] backdrop-blur lg:hidden">
      <nav className="mx-auto flex h-16 max-w-md items-center justify-around">
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
                "flex min-w-16 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-medium",
                active
                  ? "text-blue-700"
                  : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-5",
                  active && "stroke-[2.3]"
                )}
              />

              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          className="flex min-w-16 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-medium text-muted-foreground"
        >
          <Menu className="size-5" />
          More
        </button>
      </nav>
    </div>
  );
}
