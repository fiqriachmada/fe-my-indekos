import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/QueryProvider";
import FloatingControls from "@/components/floating-controls";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Indekos",
  description: "Kelola kebutuhan indekos Anda dengan aman.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakartaSans.variable} antialiased`}>
        <QueryProvider>{children}</QueryProvider>
        <FloatingControls />
      </body>
    </html>
  );
}
