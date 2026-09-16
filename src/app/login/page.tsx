import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "Sign in to Export Cargo Hub" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-[380px] overflow-hidden rounded-md border border-border bg-card">
        <div className="flex h-14 items-center justify-between bg-navy pr-3 pl-5 text-white">
          <Logo tone="inverse" markClassName="size-6" />
          <ThemeToggle className="text-white/70 hover:bg-navy-hover hover:text-white" />
        </div>
        <div className="p-6">
          <h1 className="mb-5 text-[20px] font-semibold">Sign in</h1>
          <LoginForm next={nextPath} />
        </div>
      </div>
    </main>
  );
}
