import { SkeletonLoader } from "@/components/SkeletonLoader";

export function SummonerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 flex items-center gap-4">
        <SkeletonLoader className="w-20 h-20 rounded-xl shrink-0" />
        <div className="space-y-2">
          <SkeletonLoader className="h-6 w-48" />
          <SkeletonLoader className="h-4 w-32" />
        </div>
      </div>
      <div className="space-y-3">
        <SkeletonLoader className="h-5 w-40" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="glass rounded-xl p-4 flex gap-4">
            <SkeletonLoader className="w-14 h-14 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonLoader className="h-4 w-24" />
              <SkeletonLoader className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
