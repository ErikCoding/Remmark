import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { classNames } from "@/lib/utils/text";

type FieldProps = {
  label: string;
  error?: string;
  children: React.ReactNode;
};

export function Field({ label, error, children }: FieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
      {error ? <span className="block text-sm text-danger">{error}</span> : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={classNames(
        "min-h-12 w-full rounded-lg border border-line bg-white px-3 py-3 text-base text-ink outline-none transition placeholder:text-muted focus:border-brand-600 focus:ring-4 focus:ring-brand-100",
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
        "min-h-12 w-full rounded-lg border border-line bg-white px-3 py-3 text-base text-ink outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100",
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
        "min-h-28 w-full resize-y rounded-lg border border-line bg-white px-3 py-3 text-base text-ink outline-none transition placeholder:text-muted focus:border-brand-600 focus:ring-4 focus:ring-brand-100",
        props.className,
      )}
      {...props}
    />
  );
}
