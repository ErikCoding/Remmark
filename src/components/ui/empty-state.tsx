export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-box border border-dashed border-[#b9c1c8] px-5 py-8 text-center">
      <p className="text-lg font-semibold text-ink">{title}</p>
      {body ? <p className="mx-auto mt-1 max-w-sm text-[15px] leading-snug text-steel">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
