export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-label="Ładowanie">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="h-[72px] animate-pulse rounded-box bg-[#dde2e6]" key={index} />
      ))}
    </div>
  );
}
