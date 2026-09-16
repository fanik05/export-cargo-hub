"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  /** Extra path prefixes that should also mark this link as the current page. */
  match?: string[];
  icon: React.ReactNode;
  children: React.ReactNode;
};

export function NavLink({ href, match, icon, children }: Props) {
  const pathname = usePathname();
  const active =
    pathname === href ||
    (match ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
        active ? "bg-white/10 text-white" : "text-white/70 hover:bg-navy-hover hover:text-white",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-2 bottom-0 h-[3px] rounded-full bg-amber md:inset-x-auto md:inset-y-1.5 md:left-0 md:h-auto md:w-[3px]"
        />
      )}
      <span aria-hidden className="shrink-0 [&_svg]:size-4">
        {icon}
      </span>
      {children}
    </Link>
  );
}
