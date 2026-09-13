export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="animate-pulse rounded-lg border border-line bg-white p-4" key={index}>
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="mt-4 h-3 w-1/2 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-4/5 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}
