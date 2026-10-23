import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  action,
  backHref,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  backHref?: string;
}) {
  return (
    <div className="mb-5">
      {backHref ? (
        <Link className="-ml-1 mb-2 inline-flex min-h-10 items-center gap-1 text-[15px] font-semibold text-steel hover:text-ink" href={backHref}>
          <ChevronLeft className="h-5 w-5" />
          Wróć
        </Link>
      ) : null}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-cond text-[34px] font-bold leading-none text-ink">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-[15px] text-steel">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
