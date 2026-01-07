import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
    ? process.env.NEXT_PUBLIC_SITE_URL
    : "http://localhost:3000";

export const metadata: Metadata = {
  title: {
    default: "LoteVivo - Sistema de Gestão Pecuária",
    template: "%s • LoteVivo",
  },
  description: "Gestão inteligente do seu criatório e produção.",
  applicationName: "LoteVivo",
  metadataBase: new URL(siteUrl),
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0ea86b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen text-zinc-900`}
        style={{
          backgroundImage: `
            radial-gradient(900px 500px at 15% 20%, rgba(232,248,240,0.95), transparent 60%),
            radial-gradient(900px 500px at 85% 80%, rgba(232,248,240,0.65), transparent 60%),
            url("/bg-waves.png")
          `,
          backgroundRepeat: "no-repeat, no-repeat, no-repeat",
          backgroundSize: "cover, cover, cover",
          backgroundPosition: "top left, bottom right, right center",
          backgroundAttachment: "fixed",
        }}
      >
        {children}
      </body>
    </html>
  );
}
