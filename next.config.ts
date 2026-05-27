import type { NextConfig } from "next";
import path from "path";
import { codeInspectorPlugin } from "code-inspector-plugin";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "bcryptjs"],
  turbopack: {
    root: path.resolve(__dirname),
    // code-inspector-plugin: 页面 DOM 元素点击跳转源代码
    // 使用方式: 按住 Alt + Shift (Win) / Option + Shift (Mac), 鼠标悬停页面元素会显示信息浮层, 点击自动在 IDE 中打开对应源代码位置
    rules: codeInspectorPlugin({
      bundler: "turbopack",
    }),
  },
};

export default nextConfig;
