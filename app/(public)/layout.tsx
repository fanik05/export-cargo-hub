import Link from "next/link";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight">Export Cargo Hub</Link>
      </header>
      <main className="flex flex-1 flex-col items-center px-4 py-10">{children}</main>
      <footer className="px-4 py-4 text-center text-xs text-muted-foreground">
        Admin? <Link href="/login" className="underline underline-offset-4">Sign in</Link>
      </footer>
    </div>
  );
}
