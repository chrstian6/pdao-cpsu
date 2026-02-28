// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sovffxynadhhydqctakl.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // For Turbopack, we need to mark these as external
  serverExternalPackages: ["tesseract.js", "face-api.js"],
  // Empty turbopack config to silence the error
  turbopack: {},
};

export default nextConfig;
