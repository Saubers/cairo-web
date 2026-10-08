import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/admin/ui/Card";

export default function AdminDashboardLoading() {
  return (
    <div>
      <Skeleton className="h-7 w-40" />
      <Skeleton className="mt-2 h-4 w-56" />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-2 h-8 w-12" />
              </div>
              <Skeleton className="h-11 w-11 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
