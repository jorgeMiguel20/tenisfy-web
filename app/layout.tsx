// app/layout.tsx
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchModal from "@/components/SearchModal";
import { Analytics } from "@vercel/analytics/react";
import { SITE_URL } from "@/lib/siteUrl";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Fonte só para títulos grandes (logo, headlines de secção) — dá
// personalidade à marca sem sacrificar a legibilidade do Inter no resto
// do texto/UI. Ver --font-display em app/globals.css.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Parjusto — Compara preços de ténis em Portugal",
  description: "O comparador de preços de ténis e sneakers nas melhores lojas. Encontra o melhor preço para Nike, Adidas, New Balance e mais.",
  metadataBase: new URL(SITE_URL),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
        <SearchModal />
        <Analytics />
      </body>
    </html>
  );
}