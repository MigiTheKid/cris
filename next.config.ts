import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // PDFs de documentos sobem via server action (bucket aceita até 10 MB).
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
