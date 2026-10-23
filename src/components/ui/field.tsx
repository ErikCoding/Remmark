import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { classNames } from "@/lib/utils/text";

const control =
  "min-h-12 w-full min-w-0 rounded-xl border border-line bg-card px-3.5 py-2.5 text-[17px] text-ink outline-none transition placeholder:text-[#98a2ab] focus:border-ink focus:ring-2 focus:ring-ink/10";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[15px] font-semibold text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-sm text-steel">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={classNames(control, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={classNames(control, "pr-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={classNames(control, "min-h-24 resize-y leading-snug", className)} {...props} />;
}
