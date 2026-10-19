import { TableSkeleton } from "@/components/admin/ui/TableSkeleton";

export default function AdminCarouselLoading() {
  return <TableSkeleton columns={6} withAction />;
}
