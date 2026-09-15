import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in · Export Cargo Hub" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm border border-border bg-card p-6">
        <h1 className="mb-1 text-lg font-semibold">Export Cargo Hub</h1>
        <p className="mb-6 text-sm text-muted-foreground">Admin sign in</p>
        <LoginForm next={nextPath} />
      </div>
    </main>
  );
}
