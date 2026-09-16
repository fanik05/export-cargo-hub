import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in to Export Cargo Hub" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-[380px] overflow-hidden rounded-md border border-border bg-card">
        <div className="flex h-12 items-center bg-navy px-5 text-[16px] font-semibold text-white">
          Export Cargo Hub
        </div>
        <div className="p-6">
          <h1 className="mb-5 text-[20px] font-semibold">Sign in</h1>
          <LoginForm next={nextPath} />
        </div>
      </div>
    </main>
  );
}
