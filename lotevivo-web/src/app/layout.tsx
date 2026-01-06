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

/**
 * URL base do site
 * Em produção, defina NEXT_PUBLIC_SITE_URL
 */
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

  icons: {
    icon: [
      // Favicon principal (SVG transparente)
      { url: "/lv-favicon.svg", type: "image/svg+xml" },

      // Fallbacks
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [
      {
        url: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-zinc-900`}
      >
        {children}
      </body>
    </html>
  );
}
