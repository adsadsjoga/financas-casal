import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Existe um package-lock.json solto em C:\Users\ggarc; sem isso o Next elege
  // a home do usuário como raiz do workspace.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
