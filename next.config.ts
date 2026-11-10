import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A parte antiga "Documentos" virou Jurídico › Contratos. Links salvos continuam funcionando.
  async redirects() {
    return [
      { source: "/documentos", destination: "/juridico/contratos", permanent: false },
      { source: "/documentos/novo", destination: "/juridico/contratos/novo", permanent: false },
      { source: "/documentos/:id", destination: "/juridico/contratos/ctr-legado-:id", permanent: false },
      { source: "/documentos/:id/pdf", destination: "/juridico/contratos/ctr-legado-:id/pdf", permanent: false },
      { source: "/configuracoes/modelos", destination: "/juridico/modelos", permanent: false },
      { source: "/configuracoes/modelos/:path*", destination: "/juridico/modelos", permanent: false },
    ];
  },
};

export default nextConfig;
