import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface BackLinkProps {
  href: string;
  label: string;
}

/** Small "go back to the list" link shown above create/edit form titles. */
export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-cairo-text/60 transition-all duration-200 ease-in-out hover:text-cairo-primary"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
