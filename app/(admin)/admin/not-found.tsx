import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-start gap-2 rounded-md border border-border bg-card p-6">
      <h1 className="text-[20px] font-semibold">That record does not exist</h1>
      <p className="text-sm text-muted-foreground">It may have been deleted, or the link may be out of date.</p>
      <Link href="/admin" className="rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline">
        Back to shipments
      </Link>
    </div>
  );
}
