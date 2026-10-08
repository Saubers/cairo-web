import { TableSkeleton } from "@/components/admin/ui/TableSkeleton";

export default function AdminCollectionsLoading() {
  return <TableSkeleton columns={5} withAction />;
}
