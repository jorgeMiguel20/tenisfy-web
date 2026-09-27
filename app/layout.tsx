// app/layout.tsx
import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/react";
import { SITE_URL } from "@/lib/siteUrl";
import CookieBanner from "@/components/CookieBanner";

// Uma só família em todo o site (texto e títulos) — o clone gratuito mais
// próximo da Helvetica, a letra que a Nike e a Off-White usam a sério (a
// Inter + Space Grotesk anteriores liam-se como "site feito com IA": são as
// letras por defeito de ferramentas de gerar sites e de startups de
// tecnologia). Fonte variável (100-900): os títulos usam um peso mais
// pesado (ver --font-display em app/globals.css), sem precisar de carregar
// um segundo ficheiro de letra.
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
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
      lang="pt-PT"
      className={`${publicSans.variable} antialiased`}
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
        <CookieBanner />
      </body>
    </html>
  );
}
