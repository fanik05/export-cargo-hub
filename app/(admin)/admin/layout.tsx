import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { LogoutButton } from "@/components/admin/logout-button";
import { Toaster } from "@/components/ui/sonner";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/admin" className="font-semibold">Export Cargo Hub</Link>
          <Link href="/admin" className="text-muted-foreground hover:text-foreground">Shipments</Link>
          <Link href="/admin/users" className="text-muted-foreground hover:text-foreground">Users</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{user.name}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
      <Toaster />
    </div>
  );
}
