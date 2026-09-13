import type { ButtonHTMLAttributes } from "react";
import { classNames } from "@/lib/utils/text";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  full?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white shadow-[0_14px_30px_rgba(18,24,38,0.18)] hover:-translate-y-0.5 hover:bg-slate-800 disabled:bg-slate-300 disabled:shadow-none",
  secondary: "border border-line bg-white/90 text-ink shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white disabled:text-muted",
  ghost: "bg-transparent text-ink hover:bg-white/70 disabled:text-muted",
  danger: "bg-danger text-white shadow-[0_14px_30px_rgba(185,28,28,0.18)] hover:-translate-y-0.5 hover:bg-red-800 disabled:bg-red-200 disabled:shadow-none",
};

export function Button({ className, variant = "primary", full, ...props }: ButtonProps) {
  return (
    <button
      className={classNames(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed",
        variants[variant],
        full && "w-full",
        className,
      )}
      {...props}
    />
  );
}
