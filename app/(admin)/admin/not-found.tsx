import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-start gap-2 text-sm">
      <p>That record does not exist.</p>
      <Link href="/admin" className="underline underline-offset-4">Back to shipments</Link>
    </div>
  );
}
