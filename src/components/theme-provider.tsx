"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Writes `class="dark"` onto <html> before first paint, which is what the
 * `dark` variant in globals.css keys off.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
