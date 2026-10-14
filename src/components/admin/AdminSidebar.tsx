"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Layers,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Tags,
  type LucideIcon,
} from "lucide-react";

interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/categories", label: "Categorías", icon: Tags },
  { href: "/admin/collections", label: "Colecciones", icon: Layers },
  { href: "/admin/orders", label: "Pedidos", icon: ShoppingCart },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

interface AdminSidebarContentProps {
  onNavigate?: () => void;
}

/** Nav links + brand mark + "back to store" link, shared by the desktop and mobile sidebars. */
function AdminSidebarContent({ onNavigate }: AdminSidebarContentProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-6">
        <span className="font-heading text-lg tracking-wide text-cairo-text">
          Cairo <span className="text-cairo-primary">Admin</span>
        </span>
      </div>

      {/* `pt-6` gives the first link ("Dashboard") breathing room below the
          brand mark instead of butting up against it; `overflow-y-auto`
          keeps that padding from breaking the scroll if the nav list ever
          grows taller than the sidebar's available height. */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pt-6">
        {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          // Only the Dashboard link should match exactly; the rest match any sub-route.
          const isActive = href === "/admin" ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-cairo-primary text-cairo-bg"
                  : "text-cairo-text/80 hover:bg-cairo-accent-blue/40 hover:text-cairo-text"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-cairo-text/10 px-3 py-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-cairo-text/60 transition-colors hover:bg-cairo-accent-blue/40 hover:text-cairo-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la Tienda
        </Link>
      </div>
    </div>
  );
}

interface AdminSidebarProps {
  /** Called after a nav link is clicked, used to close the mobile drawer. */
  onNavigate?: () => void;
}

/** Exported so both the fixed desktop sidebar and the mobile drawer render identical content. */
export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  return <AdminSidebarContent onNavigate={onNavigate} />;
}
