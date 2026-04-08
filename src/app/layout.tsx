import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LedgeIt — Smart Budget Tracker",
  description: "Log expenses and income using natural language. No dropdowns, no categories — just type.",
  applicationName: "LedgeIt",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LedgeIt",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f8faf9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-[100dvh] bg-ledge-bg text-ledge-data antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
