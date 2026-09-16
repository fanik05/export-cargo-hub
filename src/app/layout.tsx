import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Export Cargo Hub",
  description: "Shipment tracking for air and ocean freight",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes stamps the theme class on <html> before paint, so React must not
    // complain that the server markup lacked it.
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", geistSans.variable, jetbrainsMono.variable)}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
