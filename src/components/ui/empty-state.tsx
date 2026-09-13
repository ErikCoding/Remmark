export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-10 text-center">
      <p className="font-black text-ink">{title}</p>
      {body ? <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-muted">{body}</p> : null}
    </div>
  );
}
