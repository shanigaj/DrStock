import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/layout/AppLayout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DrStock — Smart Inventory for Modern Healthcare",
  description:
    "Healthcare & pharmacy inventory management workspace for clinics, medical stores, and healthcare providers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable}`}>
      <body className="h-full bg-background text-foreground font-sans selection:bg-primary-subtle selection:text-primary">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen bg-background">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-medium text-muted tracking-wide">Loading DrStock…</p>
              </div>
            </div>
          }
        >
          <AppLayout>{children}</AppLayout>
        </Suspense>
      </body>
    </html>
  );
}
