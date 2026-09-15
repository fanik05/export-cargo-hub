import Link from "next/link";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="bg-navy text-white">
        <div className="mx-auto w-full max-w-3xl px-4 pt-5 pb-4 sm:px-6">
          <Link href="/" className="rounded-md text-[16px] font-semibold tracking-[-0.01em] text-white">
            Export Cargo Hub
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="px-4 py-6 text-center text-[13px] text-muted-foreground">
        Admin?{" "}
        <Link href="/login" className="rounded-md underline underline-offset-4 hover:text-foreground">
          Sign in
        </Link>
      </footer>
    </div>
  );
}
