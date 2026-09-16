"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Which icon and label show is decided by the `dark` class in CSS, not by state,
 * so the button renders identically on the server and never flashes the wrong one.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => {
        const isDark =
          resolvedTheme === "dark" ||
          (resolvedTheme === undefined &&
            document.documentElement.classList.contains("dark"));
        setTheme(isDark ? "light" : "dark");
      }}
      className={cn("size-8 shrink-0 rounded-md p-0", className)}
    >
      <MoonIcon aria-hidden className="size-4 dark:hidden" />
      <SunIcon aria-hidden className="hidden size-4 dark:block" />
      <span className="sr-only">
        <span className="dark:hidden">Use dark theme</span>
        <span className="hidden dark:inline">Use light theme</span>
      </span>
    </Button>
  );
}
