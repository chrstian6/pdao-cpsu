import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    rules: {
      // Handle PDF files as assets
      "*.pdf": {
        as: "*.pdf",
        loaders: ["file-loader"],
      },
    },
  },
};

export default nextConfig;
