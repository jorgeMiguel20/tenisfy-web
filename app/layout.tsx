// app/layout.tsx
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
      className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}
    >
      {/* Sem "sticky footer" (min-h-full + flex-1): esse padrão obriga a
          página a ter sempre pelo menos a altura do ecrã, empurrando o
          rodapé para baixo e deixando um espaço em branco grande sempre
          que o conteúdo real é mais curto que o ecrã (por exemplo, quando
          "Maior poupança agora" não tem produtos para mostrar). Sem ele, o
          rodapé segue logo a seguir ao conteúdo, como seria de esperar. */}
      <body>
        <Header />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}