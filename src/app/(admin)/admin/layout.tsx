import { requireAdmin } from "@/lib/dal";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Toaster } from "@/components/ui/sonner";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <AdminSidebar userName={user.name} />
      <main className="min-w-0 flex-1 bg-background px-6 py-6 md:px-10">
        <div className="mx-auto w-full max-w-[1200px]">{children}</div>
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
