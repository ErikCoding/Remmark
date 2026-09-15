import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { classNames } from "@/lib/utils/text";

type FieldProps = {
  label: string;
  error?: string;
  children: React.ReactNode;
};

export function Field({ label, error, children }: FieldProps) {
  return (
    <label className="block space-y-2.5">
      <span className="text-[13px] font-bold text-slate-700">{label}</span>
      {children}
      {error ? <span className="block text-sm text-danger">{error}</span> : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={classNames(
        "min-h-12 w-full min-w-0 rounded-xl border border-line bg-white/95 px-3.5 py-3 text-base text-ink shadow-[0_1px_0_rgba(15,23,42,0.03)] outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100",
        props.className,
      )}
      {...props}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={classNames(
        "min-h-12 w-full min-w-0 rounded-xl border border-line bg-white/95 px-3.5 py-3 text-base text-ink shadow-[0_1px_0_rgba(15,23,42,0.03)] outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100",
        props.className,
      )}
      {...props}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={classNames(
        "min-h-28 w-full min-w-0 resize-y rounded-xl border border-line bg-white/95 px-3.5 py-3 text-base text-ink shadow-[0_1px_0_rgba(15,23,42,0.03)] outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100",
        props.className,
      )}
      {...props}
    />
  );
}
