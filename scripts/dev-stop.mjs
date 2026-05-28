#!/usr/bin/env node
// ==============================================
// WA-AKG Environment Teardown
// ==============================================
// Stops and removes the MySQL Docker container.
// Data in data/mysql-dev/ is preserved by default.
//
// Usage:
//   node scripts/dev-stop.mjs           # stop + remove container
//   node scripts/dev-stop.mjs --rm-data # also delete MySQL data
// ==============================================

import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";
import path from "path";
import { log, ROOT } from "./dev-common.mjs";

const MYSQL_CONTAINER = "wa-akg-db-dev";
const MYSQL_DATA_DIR = path.join(ROOT, "data", "mysql-dev");

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

  if (!containerExists(MYSQL_CONTAINER)) {
    log(`  Container "${MYSQL_CONTAINER}" does not exist. Nothing to do.`, "green");
    console.log("");
    return;
  }

  // Stop container if running
  if (isDockerRunning(MYSQL_CONTAINER)) {
    log("  Stopping MySQL container...", "yellow");
    execSync(`docker stop ${MYSQL_CONTAINER}`, { stdio: "ignore" });
    log("  Container stopped.", "green");
  }

  // Remove container
  log("  Removing MySQL container...", "yellow");
  execSync(`docker rm ${MYSQL_CONTAINER}`, { stdio: "ignore" });
  log("  Container removed.", "green");

  // Optional: delete data directory
  if (removeData) {
    log("  Removing MySQL data directory...", "yellow");
    if (existsSync(MYSQL_DATA_DIR)) {
      rmSync(MYSQL_DATA_DIR, { recursive: true, force: true });
      log("  Data directory removed.", "green");
    } else {
      log("  Data directory does not exist.", "yellow");
    }
  } else {
    log(`  MySQL data preserved at: ${MYSQL_DATA_DIR}`, "green");
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
