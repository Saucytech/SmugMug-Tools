import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import AlbumsLoader from "@/components/AlbumsLoader";

export const metadata: Metadata = {
  title: "Smugtools.com - Professional SmugMug Tools for Photographers",
  description: "AI-powered metadata generation, client galleries, analytics, and more. The complete SmugMug toolkit for professional photographers.",
  keywords: ["SmugMug", "photography tools", "AI metadata", "client galleries", "photographer tools", "smugtools"],
  authors: [{ name: "Saucytech" }],
  creator: "Saucytech",
  publisher: "Smugtools.com",
  openGraph: {
    title: "Smugtools.com - Professional SmugMug Tools",
    description: "Transform your SmugMug workflow with AI-powered tools",
    url: "https://smugtools.com",
    siteName: "Smugtools",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <AlbumsLoader />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
