import type { NextConfig } from "next";
import { codeInspectorPlugin } from "code-inspector-plugin";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "bcryptjs"],
  // code-inspector-plugin: DOM 元素 Alt+Shift+Click 跳转 IDE 源代码
  // 使用官方推荐的 turbopack rules 配置（>= 15.3.x），全量覆盖 **/*.{jsx,tsx,js,ts,mjs,mts}
  // turbopack: {
  //   rules: codeInspectorPlugin({
  //     bundler: "turbopack",
  //   }),
  // },
};

export default nextConfig;
