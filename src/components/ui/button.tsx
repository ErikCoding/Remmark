import type { ButtonHTMLAttributes } from "react";
import { classNames } from "@/lib/utils/text";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  full?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white shadow-soft hover:bg-brand-700 disabled:bg-brand-100",
  secondary: "border border-line bg-white text-ink hover:bg-paper disabled:text-muted",
  ghost: "bg-transparent text-ink hover:bg-paper disabled:text-muted",
  danger: "bg-danger text-white hover:bg-red-800 disabled:bg-red-200",
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
