export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-black leading-tight tracking-normal text-ink md:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
