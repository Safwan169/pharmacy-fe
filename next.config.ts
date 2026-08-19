import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root; otherwise Turbopack walks up and finds an
  // unrelated package-lock.json in the home directory.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
  experimental: {
    serverActions: {
      // The catalogue CSV is ~3.7 MB and the API accepts up to 25 MB, but a
      // Server Action body defaults to 1 MB — which rejected the upload before
      // the action ever ran. 26 MB leaves room for multipart overhead on a
      // file right at the API's limit.
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;
