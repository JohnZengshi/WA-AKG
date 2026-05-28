#!/usr/bin/env node
// ==============================================
// WA-AKG App Startup (can restart multiple times)
// ==============================================
// Clears .next cache and starts the dev server.
// Assumes environment is already set up
// (MySQL running, deps installed, schema pushed).
//
// Usage:   node scripts/dev-app.mjs
// ==============================================

import { spawn } from "child_process";
import { existsSync, rmSync } from "fs";
import path from "path";
import { log, parseEnvPorts, ROOT } from "./dev-common.mjs";

export async function startApp() {
  const { APP_PORT } = parseEnvPorts();

  console.log("");
  log("========================================", "cyan");
  log("  WA-AKG App Startup", "cyan");
  log("========================================", "cyan");
  console.log("");

  // Clear corrupted Next.js/Turbopack cache from previous unclean shutdowns
  const nextDir = path.join(ROOT, ".next");
  if (existsSync(nextDir)) {
    log("  Clearing .next cache...", "yellow");
    try {
      rmSync(nextDir, { recursive: true, force: true });
      log("  .next cache cleared.", "green");
    } catch (e) {
      log(`  Warning: could not clear .next cache: ${e.message}`, "yellow");
    }
  }

  console.log("");
  log(`  App:     http://localhost:${APP_PORT}`, "cyan");
  log(`  Swagger: http://localhost:${APP_PORT}/swagger`, "cyan");
  console.log("");
  log("  Press Ctrl+C to stop.", "green");
  console.log("");

  const child = spawn("npm", ["run", "dev"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });

  // Graceful shutdown — does NOT touch MySQL (env script manages that)
  const shutdown = () => {
    console.log("");
    log("Shutting down dev server...", "yellow");
  };

  process.on("SIGINT", () => {
    child.kill();
    shutdown();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    child.kill();
    shutdown();
    process.exit(0);
  });

  await new Promise(() => { }); // keep alive
}

// Run directly
startApp().catch((e) => {
  console.error(e);
  process.exit(1);
});
