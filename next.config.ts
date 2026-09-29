import type { NextConfig } from "next";

// Proteções enviadas ao browser em todas as páginas do site:
// - não deixar o Parjusto ser metido dentro de outro site (evita que alguém
//   engane uma pessoa com sessão iniciada a carregar em "Apagar conta" sem
//   perceber);
// - o browser não "adivinha" o tipo dos ficheiros;
// - as lojas só veem de onde vem a visita (parjusto.pt), não a página exata;
// - o site não pede acesso ao microfone, localização nem pagamentos.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  // Não anunciar que o site é feito com Next.js.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
