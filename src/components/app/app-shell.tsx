"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/app/auth-gate";
import { classNames } from "@/lib/utils/text";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "⌂" },
  { href: "/projects", label: "Budowy", icon: "▦" },
  { href: "/logs/new", label: "+", icon: "+" },
  { href: "/reports", label: "Raporty", icon: "≡" },
  { href: "/account", label: "Konto", icon: "◦" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AuthGate>
      <div className="min-h-screen bg-paper pb-24 md:pb-0">
        <div className="mx-auto grid min-h-screen max-w-6xl md:grid-cols-[220px_1fr]">
          <aside className="no-print hidden border-r border-line bg-white px-4 py-6 md:block">
            <Link className="mb-8 flex items-center gap-3" href="/dashboard">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">R</span>
              <span className="text-lg font-bold text-ink">Remmark</span>
            </Link>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  className={classNames(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted transition hover:bg-paper hover:text-ink",
                    pathname === item.href && "bg-brand-50 text-brand-700",
                    item.href === "/logs/new" && "mt-4 bg-brand-600 text-white hover:bg-brand-700 hover:text-white",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <span className="w-5 text-center">{item.icon}</span>
                  <span>{item.label === "+" ? "Dodaj wpis" : item.label}</span>
                </Link>
              ))}
            </nav>
          </aside>
          <main className="min-w-0 px-4 py-5 md:px-8 md:py-8">{children}</main>
        </div>
        <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 px-2 pb-[calc(0.5rem+var(--safe-bottom))] pt-2 backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const isAdd = item.href === "/logs/new";
              return (
                <Link
                  aria-label={item.label === "+" ? "Dodaj wpis" : item.label}
                  className={classNames(
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold text-muted",
                    active && "text-brand-700",
                    isAdd && "-mt-7",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <span
                    className={classNames(
                      "flex h-7 w-7 items-center justify-center rounded-md text-base",
                      isAdd && "h-14 w-14 rounded-full bg-brand-600 text-3xl text-white shadow-soft",
                      active && !isAdd && "bg-brand-50",
                    )}
                  >
                    {item.icon}
                  </span>
                  {!isAdd ? <span>{item.label}</span> : null}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </AuthGate>
  );
}
