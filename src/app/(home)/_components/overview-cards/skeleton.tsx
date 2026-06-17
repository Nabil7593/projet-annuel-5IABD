import { Skeleton } from "@/components/ui/skeleton";

export function OverviewCardsSkeleton() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 sm:gap-6 2xl:gap-7.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="mt-4 h-8 w-28" />
            <Skeleton className="mt-1 h-3 w-full" />
            <Skeleton className="mt-4 h-2.5 w-full rounded-full" />
            <Skeleton className="mt-1 h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
