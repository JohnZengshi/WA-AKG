import type { NextConfig } from "next";
import { codeInspectorPlugin } from "code-inspector-plugin";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "bcryptjs"],
  turbopack: {
    rules: codeInspectorPlugin({
      bundler: "turbopack",
      exclude: [
        "**/layout.{tsx,ts,jsx,js}",
        "**/page.{tsx,ts,jsx,js}",
        "**/loading.{tsx,ts,jsx,js}",
        "**/error.{tsx,ts,jsx,js}",
        "**/not-found.{tsx,ts,jsx,js}",
        "**/global-error.{tsx,ts,jsx,js}",
        "**/template.{tsx,ts,jsx,js}",
        "**/default.{tsx,ts,jsx,js}",
        "**/icon.{tsx,ts,jsx,js}",
        "**/apple-icon.{tsx,ts,jsx,js}",
        "**/middleware.{tsx,ts,jsx,js}",
        "**/node_modules/**",
      ],
    }),
  },
};

export default nextConfig;
