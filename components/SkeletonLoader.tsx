export function SkeletonLoader({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/10 ${className ?? ""}`}
      aria-hidden
    />
  );
}

export function MatchCardSkeleton() {
  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex gap-3">
        <SkeletonLoader className="h-12 w-12 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonLoader className="h-4 w-32" />
          <SkeletonLoader className="h-3 w-24" />
        </div>
      </div>
      <div className="flex gap-4">
        <SkeletonLoader className="h-6 w-16" />
        <SkeletonLoader className="h-6 w-16" />
        <SkeletonLoader className="h-6 w-20" />
      </div>
      <div className="flex gap-2">
        <SkeletonLoader className="h-8 w-20 rounded" />
        <SkeletonLoader className="h-8 w-20 rounded" />
      </div>
    </div>
  );
}

export function CrewCardSkeleton() {
  return (
    <div className="glass rounded-xl p-5 space-y-3">
      <SkeletonLoader className="h-5 w-3/4" />
      <SkeletonLoader className="h-3 w-1/2" />
      <SkeletonLoader className="h-4 w-20" />
    </div>
  );
}
