import { TableSkeleton } from "@/components/admin/ui/TableSkeleton";

export default function AdminProductsLoading() {
  return <TableSkeleton columns={8} withAction />;
}
