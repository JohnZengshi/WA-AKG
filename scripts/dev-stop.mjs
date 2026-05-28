#!/usr/bin/env node
// ==============================================
// WA-AKG Environment Teardown
// ==============================================
// Stops and removes the PostgreSQL Docker container.
// Data in data/pg-dev/ is preserved by default.
//
// Usage:
//   node scripts/dev-stop.mjs           # stop + remove container
//   node scripts/dev-stop.mjs --rm-data # also delete PostgreSQL data
// ==============================================

import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";
import path from "path";
import { log, ROOT } from "./dev-common.mjs";

const DB_CONTAINER = "wa-akg-db-dev";
const DB_DATA_DIR = path.join(ROOT, "data", "pg-dev");

function isDockerRunning(container) {
  try {
    const out = execSync(`docker ps --format "{{.Names}}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return out.split("\n").map((s) => s.trim()).includes(container);
  } catch {
    return false;
  }
}

function containerExists(container) {
  try {
    const out = execSync(`docker ps -a --format "{{.Names}}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return out.split("\n").map((s) => s.trim()).includes(container);
  } catch {
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const removeData = args.includes("--rm-data");

  console.log("");
  log("========================================", "cyan");
  log("  WA-AKG Environment Teardown", "cyan");
  log("========================================", "cyan");
  console.log("");

  if (!containerExists(DB_CONTAINER)) {
    log(`  Container "${DB_CONTAINER}" does not exist. Nothing to do.`, "green");
    console.log("");
    return;
  }

  // Stop container if running
  if (isDockerRunning(DB_CONTAINER)) {
    log("  Stopping PostgreSQL container...", "yellow");
    execSync(`docker stop ${DB_CONTAINER}`, { stdio: "ignore" });
    log("  Container stopped.", "green");
  }

  // Remove container
  log("  Removing PostgreSQL container...", "yellow");
  execSync(`docker rm ${DB_CONTAINER}`, { stdio: "ignore" });
  log("  Container removed.", "green");

  // Optional: delete data directory
  if (removeData) {
    log("  Removing PostgreSQL data directory...", "yellow");
    if (existsSync(DB_DATA_DIR)) {
      rmSync(DB_DATA_DIR, { recursive: true, force: true });
      log("  Data directory removed.", "green");
    } else {
      log("  Data directory does not exist.", "yellow");
    }
  } else {
    log(`  PostgreSQL data preserved at: ${DB_DATA_DIR}`, "green");
    log("  Use --rm-data to also delete data.", "yellow");
  }

  console.log("");
  log("  Environment cleaned up.", "green");
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
