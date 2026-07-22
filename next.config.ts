import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["preview-chat-ab644068-32bc-4799-af7a-fdbd3a690072.space-z.ai"],
};

export default nextConfig;
