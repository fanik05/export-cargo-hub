import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="bg-navy text-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="rounded-md">
            <Logo tone="inverse" />
          </Link>
          <ThemeToggle className="text-white/70 hover:bg-navy-hover hover:text-white" />
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="bg-navy text-white/60">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-5 text-[13px] sm:px-6">
          <span>Shipment tracking for air and ocean freight</span>
          <Link href="/login" className="rounded-md underline underline-offset-4 hover:text-white">
            Admin sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
