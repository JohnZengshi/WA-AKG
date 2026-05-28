#!/usr/bin/env node
// ==============================================
// Shared utilities for start-*.mjs scripts
// ==============================================

import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

export const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export function log(msg, color = "") {
  const colors = {
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    reset: "\x1b[0m",
  };
  const c = colors[color] || "";
  console.log(c + msg + colors.reset);
}

export function run(command, cwd = ROOT) {
  execSync(command, { cwd, stdio: "inherit" });
}

export async function isPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(2000);
    sock.on("connect", () => { sock.destroy(); resolve(true); });
    sock.on("error", () => resolve(false));
    sock.on("timeout", () => { sock.destroy(); resolve(false); });
    sock.connect(port, host);
  });
}

export async function isPostgresPort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(3000);
    let detected = false;
    sock.on("data", (data) => {
      // PostgreSQL sends 'R' (AuthRequest, 0x52) or 'N' (NoticeResponse, 0x4E) as first byte
      if (data.length >= 1) {
        const firstByte = data[0];
        if (firstByte === 0x52 || firstByte === 0x4E) {
          detected = true;
        }
      }
      sock.destroy();
    });
    sock.on("connect", () => { });
    sock.on("close", () => resolve(detected));
    sock.on("error", () => resolve(false));
    sock.on("timeout", () => { sock.destroy(); resolve(false); });
    sock.connect(port, host);
  });
}

/**
 * Parse DB_PORT and APP_PORT from .env file.
 * Returns { DB_PORT: number, APP_PORT: number } with defaults 5432 / 3001.
 */
export function parseEnvPorts() {
  let DB_PORT = 5432;
  let APP_PORT = 3001;
  try {
    const envPath = path.join(ROOT, ".env");
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, "utf-8");
      const match = envContent.match(/^DATABASE_URL="postgresql:\/\/[^:]+:[^@]+@localhost:(\d+)\//m);
      if (match) {
        const p = parseInt(match[1], 10);
        if (!isNaN(p) && p > 0) DB_PORT = p;
      }
      const portMatch = envContent.match(/^PORT\s*=\s*"?(\d+)"?/m);
      if (portMatch) {
        const p = parseInt(portMatch[1], 10);
        if (!isNaN(p) && p > 0) APP_PORT = p;
      }
    }
  } catch { /* ignore */ }
  return { DB_PORT, APP_PORT };
}
