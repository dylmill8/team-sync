import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
});

const nextConfig: NextConfig = {
  images: {
    domains: ["ns6ela3qh5m1napj.public.blob.vercel-storage.com", "placehold.co"],
  },
};

export default withPWA(nextConfig); // Pass nextConfig directly
