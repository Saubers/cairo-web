import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/admin/ui/Card";

export default function AdminOrderDetailLoading() {
  return (
    <div>
      <Skeleton className="h-4 w-24" />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="space-y-4 px-6 py-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-14 w-14 rounded-md" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="mt-2 h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="space-y-4 px-6 py-5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </Card>
          <Card>
            <div className="px-6 py-5">
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
