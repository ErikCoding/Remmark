"use client";

import Link from "next/link";
import { BarChart3, CalendarDays, HardHat, Sun, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/app/auth-gate";
import { useAuth } from "@/context/auth-context";
import { classNames, initials } from "@/lib/utils/text";

const navItems = [
  { href: "/dashboard", label: "Dziś", icon: Sun },
  { href: "/history", label: "Historia", icon: CalendarDays },
  { href: "/reports", label: "Raporty", icon: BarChart3 },
  { href: "/projects", label: "Budowy", icon: HardHat },
];

export function AppShell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  const pathname = usePathname();
  const { profile, user } = useAuth();

  return (
    <AuthGate>
      <div className="min-h-screen pb-[calc(5.5rem+var(--safe-bottom))] md:pb-10">
        <header className="no-print sticky top-0 z-30 border-b border-line bg-concrete/95 backdrop-blur">
          <div className={classNames("mx-auto flex h-14 items-center gap-4 px-4", wide ? "max-w-4xl" : "max-w-2xl")}>
            <Link className="flex items-center gap-2" href="/dashboard" aria-label="Remmark – strona główna">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-ink font-cond text-xl font-bold text-white">
                R
                <span className="absolute inset-x-1.5 bottom-1 h-[3px] rounded-full bg-vis" />
              </span>
              <span className="font-cond text-xl font-bold tracking-wide text-ink">Remmark</span>
            </Link>
            <nav className="ml-4 hidden flex-1 items-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  className={classNames(
                    "rounded-lg px-3 py-2 text-[15px] font-semibold text-steel hover:text-ink",
                    isActive(pathname, item.href) && "bg-card text-ink shadow-[inset_0_0_0_1px_#D2D8DD]",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link
              aria-label="Konto"
              className={classNames(
                "ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-sm font-bold text-ink",
                pathname.startsWith("/account") && "border-ink",
              )}
              href="/account"
            >
              {profile?.name || user?.email ? initials(profile?.name || user?.email) : <UserRound className="h-5 w-5" />}
            </Link>
          </div>
        </header>

        <main className={classNames("mx-auto px-4 pt-5", wide ? "max-w-4xl" : "max-w-2xl")}>{children}</main>

        <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card pb-[var(--safe-bottom)] md:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  className={classNames(
                    "relative flex min-h-[64px] flex-col items-center justify-center gap-1 text-[13px] font-semibold",
                    active ? "text-ink" : "text-steel",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  {active ? <span className="absolute inset-x-6 top-0 h-[3px] rounded-b bg-vis" /> : null}
                  <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </AuthGate>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/dzien") || pathname.startsWith("/logs");
  if (href === "/history") return pathname.startsWith("/history");
  return pathname.startsWith(href);
}
