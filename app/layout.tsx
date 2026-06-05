import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { getSiteSettings } from "@/lib/db";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export function generateMetadata(): Metadata {
  const settings = getSiteSettings();
  return {
    title: settings?.site_title || "LinkGuide",
    description: "Self-hosted link shortening application",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
