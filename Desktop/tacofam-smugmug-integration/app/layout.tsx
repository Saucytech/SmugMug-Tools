import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TacoFam SmugMug Integration",
  description: "Browse and select SmugMug photos for TacoFam articles",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
