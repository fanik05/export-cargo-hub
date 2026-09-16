import Link from "next/link";
import { PackageIcon, UsersIcon } from "@phosphor-icons/react/dist/ssr";
import { LogoutButton } from "@/components/admin/logout-button";
import { NavLink } from "@/components/admin/nav-link";

export function AdminSidebar({ userName }: { userName: string }) {
  return (
    <aside className="bg-navy text-white md:w-[220px] md:shrink-0">
      <div className="flex h-full flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 md:flex-col md:flex-nowrap md:items-stretch md:justify-start md:gap-0 md:px-3 md:py-5">
        <Link
          href="/admin"
          className="rounded-md text-[16px] font-semibold tracking-[-0.01em] text-white md:px-3"
        >
          Export Cargo Hub
        </Link>

        <nav
          aria-label="Admin"
          className="flex items-center gap-1 md:mt-7 md:flex-col md:items-stretch md:gap-0.5"
        >
          <NavLink href="/admin" match={["/admin/shipments"]} icon={<PackageIcon />}>
            Shipments
          </NavLink>
          <NavLink href="/admin/users" match={["/admin/users"]} icon={<UsersIcon />}>
            Users
          </NavLink>
        </nav>

        <div className="flex items-center gap-2 md:mt-auto md:flex-col md:items-stretch md:gap-1 md:border-t md:border-white/10 md:pt-4">
          <span className="hidden text-[13px] text-white/70 md:block md:px-3">{userName}</span>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
