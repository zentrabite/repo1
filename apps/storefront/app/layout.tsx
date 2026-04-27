import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Order Online",
  description: "Order directly from your favourite local business.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
