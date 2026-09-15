"use client";

import Link from "next/link";
import { BarChart3, BriefcaseBusiness, CirclePlus, Home, ShieldCheck, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/app/auth-gate";
import { classNames } from "@/lib/utils/text";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/projects", label: "Budowy", icon: BriefcaseBusiness },
  { href: "/logs/new", label: "Dodaj", icon: CirclePlus },
  { href: "/reports", label: "Raporty", icon: BarChart3 },
  { href: "/account", label: "Konto", icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeIndex = Math.max(
    navItems.findIndex((item) => isActivePath(pathname, item.href)),
    0,
  );

  return (
    <AuthGate>
      <div className="min-h-screen pb-24 md:pb-0">
        <div className="mx-auto grid min-h-screen max-w-7xl md:grid-cols-[260px_1fr]">
          <aside className="no-print sticky top-0 hidden h-screen border-r border-white/70 bg-white/80 px-4 py-6 shadow-[12px_0_40px_rgba(15,23,42,0.04)] backdrop-blur-xl md:block">
            <Link className="mb-8 flex items-center gap-3 rounded-2xl px-2" href="/dashboard">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-lg font-black text-white shadow-[0_14px_30px_rgba(18,24,38,0.20)]">R</span>
              <span>
                <span className="block text-lg font-black leading-tight text-ink">Remmark</span>
                <span className="block text-xs font-semibold text-muted">Worklog</span>
              </span>
            </Link>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);
                const isAdd = item.href === "/logs/new";
                return (
                  <Link
                    className={classNames(
                      "group flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-bold text-muted transition hover:bg-slate-100/80 hover:text-ink",
                      active && "bg-ink text-white shadow-[0_14px_30px_rgba(18,24,38,0.16)] hover:bg-ink hover:text-white",
                      isAdd && !active && "mt-5 bg-brand-600 text-white shadow-[0_14px_30px_rgba(37,99,235,0.20)] hover:bg-brand-700 hover:text-white",
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                    <span>{isAdd ? "Dodaj wpis" : item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="absolute inset-x-4 bottom-6 rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Tryb prywatny</p>
              </div>
              <p className="mt-2 text-sm font-bold leading-5 text-ink">Dane dostępne tylko po zalogowaniu.</p>
            </div>
          </aside>
          <main className="min-w-0 px-4 py-5 md:px-8 md:py-8 lg:px-10">
            <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/80 bg-white/85 px-3 py-3 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur md:hidden">
              <Link className="flex items-center gap-3" href="/dashboard">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-base font-black text-white">R</span>
                <span>
                  <span className="block text-base font-black leading-tight text-ink">Remmark</span>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Worklog</span>
                </span>
              </Link>
              <Link className="rounded-2xl bg-brand-600 px-3 py-2 text-sm font-black text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]" href="/logs/new">
                Nowy
              </Link>
            </div>
            <div className="mx-auto max-w-5xl">{children}</div>
          </main>
        </div>
        <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-white/80 bg-white/92 px-2 pb-[calc(0.55rem+var(--safe-bottom))] pt-2 shadow-[0_-18px_46px_rgba(15,23,42,0.13)] backdrop-blur-xl md:hidden">
          <div className="relative mx-auto grid max-w-md grid-cols-5 items-end gap-1 overflow-visible rounded-[1.65rem]">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 top-0 z-0 w-1/5 rounded-[1.55rem] bg-ink shadow-[0_18px_34px_rgba(18,24,38,0.18)] transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
              style={{ transform: `translateX(${activeIndex * 100}%)` }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 z-0 h-1.5 w-1/5 transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
              style={{ transform: `translateX(${activeIndex * 100}%)` }}
            >
              <span className="mx-auto block h-1.5 w-8 rounded-full bg-brand-500 shadow-[0_0_20px_rgba(59,130,246,0.55)]" />
            </span>
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const isAdd = item.href === "/logs/new";
              const Icon = item.icon;
              return (
                <Link
                  aria-label={isAdd ? "Dodaj wpis" : item.label}
                  className={classNames(
                    "relative z-10 flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold text-muted transition duration-500 ease-[cubic-bezier(.16,1,.3,1)]",
                    active && "text-white",
                    isAdd && "-mt-7",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <span
                    className={classNames(
                      "flex h-8 w-8 items-center justify-center rounded-xl transition duration-500 ease-[cubic-bezier(.16,1,.3,1)]",
                      active && !isAdd && "-translate-y-1.5 scale-125 bg-white/14",
                      isAdd && "h-14 w-14 rounded-2xl bg-ink text-white shadow-[0_18px_34px_rgba(18,24,38,0.24)]",
                      isAdd && active && "-translate-y-1.5 scale-110 animate-[mobile-add-pulse_1.55s_ease-in-out_infinite] ring-4 ring-brand-100",
                    )}
                  >
                    <Icon className={classNames("transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)]", isAdd ? "h-7 w-7" : "h-5 w-5", active && "scale-110")} strokeWidth={2.25} />
                  </span>
                  {!isAdd ? <span className={classNames("transition duration-500 ease-[cubic-bezier(.16,1,.3,1)]", active && "-translate-y-1 font-black")}>{item.label}</span> : null}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </AuthGate>
  );
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard";
  if (href === "/logs/new") return pathname === "/logs/new";
  if (href === "/projects") return pathname.startsWith("/projects");
  if (href === "/reports") return pathname.startsWith("/reports");
  if (href === "/account") return pathname.startsWith("/account");
  return pathname === href;
}
