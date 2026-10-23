import type { ButtonHTMLAttributes } from "react";
import { classNames } from "@/lib/utils/text";

type ButtonVariant = "primary" | "vis" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-[#2c3843] disabled:bg-[#9aa4ad]",
  vis: "bg-vis text-white hover:bg-vis-dark disabled:bg-[#f3b493]",
  secondary: "border border-line bg-card text-ink hover:border-steel disabled:text-steel",
  ghost: "bg-transparent text-ink hover:bg-well disabled:text-steel",
  danger: "border border-stop/30 bg-stop-soft text-stop hover:border-stop disabled:opacity-60",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-12 px-4 text-base",
  lg: "min-h-16 px-6 text-xl",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", full = false) {
  return classNames(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    full && "w-full",
  );
}

export function Button({ className, variant = "primary", size = "md", full, type = "button", ...props }: ButtonProps) {
  return <button className={classNames(buttonClass(variant, size, full), className)} type={type} {...props} />;
}
