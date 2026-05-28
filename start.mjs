#!/usr/bin/env node
// ==============================================
// WA-AKG Startup Script (cross-platform)
// ==============================================
// Prerequisites:
//   - Node.js >= 18
//   - Docker Desktop (for MySQL)
//   - .env file (already exists in project root)
// ==============================================

import { execSync, spawn } from "child_process";
import { existsSync, readFileSync, writeFileSync, rmSync, readdirSync } from "fs";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname);
const MYSQL_CONTAINER = "wa-akg-db-dev";
const MYSQL_DATA_DIR = path.join(ROOT, "data", "mysql-dev");
let MYSQL_PORT = 3307; // 默认端口
let APP_PORT = 3001; // 默认端口

function log(msg, color = "") {
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

function run(command, cwd = ROOT) {
  execSync(command, { cwd, stdio: "inherit" });
}

async function waitForDocker(password) {
  for (let i = 0; i < 30; i++) {
    try {
      execSync(
        `docker exec ${MYSQL_CONTAINER} mysqladmin ping -uroot -p${password} --silent`,
        { stdio: "ignore" }
      );
      return true;
    } catch { }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

function isPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(2000);
    sock.on("connect", () => { sock.destroy(); resolve(true); });
    sock.on("error", () => resolve(false));
    sock.on("timeout", () => { sock.destroy(); resolve(false); });
    sock.connect(port, host);
  });
}

function isMySQLPort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(3000);
    let detected = false;
    sock.on("data", (data) => {
      // MySQL initial handshake: the 5th byte (index 4) is the length of
      // the server version string — typically 5-30 bytes
      if (data.length >= 5) {
        const versionLen = data[4];
        if (versionLen > 0 && versionLen < 100) {
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
  // Parse MySQL port from DATABASE_URL in .env if it exists
  try {
    const envPath = path.join(ROOT, ".env");
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, "utf-8");
      const match = envContent.match(/^DATABASE_URL="mysql:\/\/[^:]+:[^@]+@localhost:(\d+)\/wa_akg"/m);
      if (match) {
        const p = parseInt(match[1], 10);
        if (!isNaN(p) && p > 0) MYSQL_PORT = p;
      }
      // Parse app server port from PORT in .env
      const portMatch = envContent.match(/^PORT\s*=\s*"?(\d+)"?/m);
      if (portMatch) {
        const p = parseInt(portMatch[1], 10);
        if (!isNaN(p) && p > 0) APP_PORT = p;
      }
    }
  } catch { }

  console.log("");
  log("========================================", "cyan");
  log("  WA-AKG Startup Script", "cyan");
  log("========================================", "cyan");
  console.log("");

  // 1. Check prerequisites
  log("[1/5] Checking prerequisites...", "yellow");
  log(`  Node.js: ${process.version}`, "green");

  try {
    execSync("docker --version", { stdio: "pipe" });
    const dv = execSync("docker --version", { encoding: "utf-8" }).trim();
    log(`  Docker:  ${dv}`, "green");
  } catch {
    log("  Error: Docker is not installed or Docker Desktop is not running.", "red");
    process.exit(1);
  }
  // Auto-start Colima if installed but not running (macOS only via Colima; Windows uses Docker Desktop)
  const colimaBin = process.platform === "win32" ? "where colima" : "which colima";
  try {
    execSync(colimaBin, { stdio: "pipe" });
    // colima is installed, check if running
    try {
      execSync("colima status", { stdio: "pipe" });
    } catch {
      log("  Colima is installed but not running. Starting Colima...", "yellow");
      execSync("colima start", { stdio: "inherit" });
      log("  Colima started.", "green");
    }
    // Switch Docker context to colima after starting
    try {
      execSync("docker context use colima", { stdio: "pipe" });
      log("  Switched Docker context to colima.", "green");
    } catch {
      log("  Warning: could not switch Docker context to colima.", "yellow");
    }
  } catch {
    // colima not installed, proceed normally
  }
  console.log("");

  // 2. Start MySQL
  log("[2/5] Starting MySQL via Docker...", "yellow");

  const port3306 = await isPortOpen(MYSQL_PORT);
  let mysqlOn3306 = false;
  if (port3306) {
    // Verify it's actually MySQL, not just something occupying the port
    mysqlOn3306 = await isMySQLPort(MYSQL_PORT);
    if (mysqlOn3306) {
      log(`  MySQL is already running on port ${MYSQL_PORT}.`, "green");
    } else {
      log(`  Port ${MYSQL_PORT} is in use by a non-MySQL service. Will start our own MySQL container.`, "yellow");
    }
  }

  if (mysqlOn3306) {
    // Real MySQL is running externally — skip container creation entirely
  } else if (isDockerRunning(MYSQL_CONTAINER)) {
    log("  MySQL container already running.", "green");
  } else if (containerExists(MYSQL_CONTAINER)) {
    // Container exists but stopped - try to restart it
    log("  Starting existing MySQL container...");
    execSync(`docker start ${MYSQL_CONTAINER}`, { stdio: "ignore" });
    log("  Waiting for MySQL to be ready...");
    const ready = await waitForDocker("rootpassword");
    if (!ready) {
      log("  Container failed to start (data may be corrupted). Recreating...", "yellow");
      execSync(`docker rm -f ${MYSQL_CONTAINER}`, { stdio: "ignore" });
      // Fall through to create new container below
    } else {
      log("  MySQL is ready.", "green");
    }
  }

  // Create MySQL container (if it doesn't exist or was removed above)
  if (!isDockerRunning(MYSQL_CONTAINER) && !mysqlOn3306) {
    try { execSync(`docker rm -f ${MYSQL_CONTAINER}`, { stdio: "ignore" }); } catch { }

    // Check if image exists locally, pull if needed
    let imageExists = '';
    try {
      imageExists = execSync(`docker images -q mysql:8.0`, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
    } catch {
      imageExists = '';
    }
    if (!imageExists) {
      // Try multiple registries (China-friendly mirrors)
      const registries = [
        "docker.io/library/mysql:8.0",
        "docker.m.daocloud.io/library/mysql:8.0",
        "mirror.ccs.tencentyun.com/library/mysql:8.0",
        "hub-mirror.c.163.com/library/mysql:8.0",
      ];

      let pulled = false;
      for (const registry of registries) {
        log(`  Pulling mysql:8.0 from ${registry.split("/")[0]}...`);
        try {
          execSync(`docker pull ${registry}`, { stdio: "inherit", timeout: 300000 });
          // Re-tag to mysql:8.0 so rest of script works consistently
          execSync(`docker tag ${registry} mysql:8.0`, { stdio: "ignore" });
          execSync(`docker rmi ${registry}`, { stdio: "ignore" }); // remove mirror tag
          pulled = true;
          break;
        } catch {
          log(`  Failed, trying next mirror...`, "yellow");
          continue;
        }
      }

      if (!pulled) {
        log("  Failed to pull mysql:8.0 from all mirrors.", "red");
        log("  Try these steps manually:", "yellow");
        log("    1. Configure proxy: Docker Desktop → Settings → Resources → Proxies");
        log("    2. Or configure mirrors: Docker Desktop → Settings → Docker Engine → add registry-mirrors");
        log("    3. Or run: docker pull mysql:8");
        process.exit(1);
      }
    }

    run(
      `docker run -d ` +
      `--name ${MYSQL_CONTAINER} ` +
      `-e MYSQL_ROOT_PASSWORD=rootpassword ` +
      `-e MYSQL_DATABASE=wa_akg ` +
      `-v "${MYSQL_DATA_DIR}:/var/lib/mysql" ` +
      `-p ${MYSQL_PORT}:3306 ` +
      `mysql:8.0`
    );

    log("  Waiting for MySQL to be ready...");
    const ready = await waitForDocker("rootpassword");
    if (!ready) {
      // Check for common startup failures and auto-recover
      const logs = execSync(`docker logs ${MYSQL_CONTAINER} 2>&1`, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] });
      if (logs.includes("Unable to lock") || logs.includes("ibdata1") || logs.includes("OS errno 11") || logs.includes("Error: 11")) {
        log("  Data directory locked by another process (macOS Spotlight/Cloud). Clearing and retrying...", "yellow");
        execSync(`docker rm -f ${MYSQL_CONTAINER}`, { stdio: "ignore" });
        try { execSync(`rm -rf "${MYSQL_DATA_DIR}"`, { stdio: "ignore" }); } catch { }
        // Retry once
        run(
          `docker run -d ` +
          `--name ${MYSQL_CONTAINER} ` +
          `-e MYSQL_ROOT_PASSWORD=rootpassword ` +
          `-e MYSQL_DATABASE=wa_akg ` +
          `-v "${MYSQL_DATA_DIR}:/var/lib/mysql" ` +
          `-p ${MYSQL_PORT}:3306 ` +
          `mysql:8.0`
        );
        log("  Waiting for MySQL to be ready (retry)...");
        const retryReady = await waitForDocker("rootpassword");
        if (!retryReady) {
          log("  MySQL still failed to start after retry. Check 'docker logs " + MYSQL_CONTAINER + "'", "red");
          process.exit(1);
        }
      } else {
        log("  MySQL failed to start. Check 'docker logs " + MYSQL_CONTAINER + "'", "red");
        process.exit(1);
      }
    }
    log("  MySQL is ready.", "green");
  }
  console.log("");

  // 3. Install dependencies
  log("[3/5] Installing dependencies...", "yellow");
  run("npm install --legacy-peer-deps");
  log("  Done.", "green");
  console.log("");

  // 3.5. Ensure .env exists with correct DATABASE_URL, PORT, and BASE_URL
  const envPath = path.join(ROOT, ".env");
  const envExamplePath = path.join(ROOT, ".env.example");
  const dbUrlLine = `DATABASE_URL="mysql://root:rootpassword@localhost:${MYSQL_PORT}/wa_akg"`;
  const portLine = `PORT=${APP_PORT}`;
  const baseUrlLine = `BASE_URL="http://localhost:${APP_PORT}"`;

  if (!existsSync(envPath)) {
    log("[3.5/5] Creating .env...", "yellow");
    if (existsSync(envExamplePath)) {
      const exampleContent = readFileSync(envExamplePath, "utf-8");
      const filteredLines = exampleContent
        .split("\n")
        .filter((l) => !/^\s*(DATABASE_URL|PORT|BASE_URL)\s*=/.test(l))
        .join("\n");
      writeFileSync(
        envPath,
        `# Auto-generated by start.mjs — DO NOT EDIT DIRECTLY\n${dbUrlLine}\n${portLine}\n${baseUrlLine}\n\n# === From .env.example ===\n${filteredLines}`,
        "utf-8"
      );
    } else {
      writeFileSync(envPath, `${dbUrlLine}\n${portLine}\n${baseUrlLine}\n`, "utf-8");
    }
    log("  .env created.", "green");
  } else {
    // .env exists — ensure values match script configuration
    let updated = readFileSync(envPath, "utf-8");
    let changed = false;

    // Sync DATABASE_URL
    const dbMatch = updated.match(/^DATABASE_URL="mysql:.*"/m);
    if (dbMatch && dbMatch[0] !== dbUrlLine) {
      updated = updated.replace(/^DATABASE_URL="mysql:.*"/m, dbUrlLine);
      changed = true;
    } else if (!dbMatch) {
      updated = `${dbUrlLine}\n${updated}`;
      changed = true;
    }

    // Sync PORT
    const portMatch = updated.match(/^PORT\s*=\s*"?(\d+)"?/m);
    if (portMatch && portMatch[0] !== `PORT=${APP_PORT}` && portMatch[0] !== `PORT="${APP_PORT}"`) {
      updated = updated.replace(/^PORT\s*=\s*"?\d+"?/m, portLine);
      changed = true;
    } else if (!portMatch) {
      updated = `${portLine}\n${updated}`;
      changed = true;
    }

    // Sync BASE_URL
    const baseMatch = updated.match(/^BASE_URL\s*=\s*"http:\/\/localhost:\d+"/m);
    if (baseMatch && baseMatch[0] !== baseUrlLine) {
      updated = updated.replace(/^BASE_URL\s*=\s*"http:\/\/localhost:\d+"/m, baseUrlLine);
      changed = true;
    } else if (!baseMatch) {
      updated = `${baseUrlLine}\n${updated}`;
      changed = true;
    }

    if (changed) {
      writeFileSync(envPath, updated, "utf-8");
      log(`  .env updated: DATABASE_URL port=${MYSQL_PORT}, PORT=${APP_PORT}, BASE_URL=${APP_PORT}.`, "yellow");
    } else {
      log("[3.5/5] .env is correct.", "green");
    }
  }
  console.log("");

  // 4. Database schema
  log("[4/5] Setting up database schema...", "yellow");
  run("npx prisma db push --accept-data-loss");

  // prisma generate: on Windows, Defender locks .dll.node files causing EPERM
  // rename errors. Try to generate, but if it fails and the engine binary still
  // exists, the EPERM is cosmetic — the existing engine is still valid.
  const prismaClientDir = path.join(ROOT, "node_modules", ".prisma", "client");
  try {
    execSync("npx prisma generate", { cwd: ROOT, stdio: "pipe", timeout: 120000 });
    log("  prisma generate done.", "green");
  } catch {
    // Check if engine file actually exists (EPERM means the rename failed,
    // but the existing .dll.node is still there and loadable)
    const engineExists = existsSync(prismaClientDir) && readdirSync(prismaClientDir).some(f => f.endsWith(".dll.node") || f.endsWith(".so.node"));
    if (engineExists) {
      log("  prisma generate skipped (EPERM suppressed, existing engine is valid).", "yellow");
    } else {
      // Real failure — retry once with visible output
      log("  prisma generate failed, retrying once...", "yellow");
      run("npx prisma generate");
      log("  prisma generate done.", "green");
    }
  }

  // If database is fresh (no users), create default admin
  // Write a transient script into the project root so @prisma/client resolves correctly
  const checkScript = path.join(ROOT, ".check-users.mjs");
  writeFileSync(
    checkScript,
    `import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const count = await p.user.count();
  console.log(count);
} finally {
  await p.\$disconnect();
}
`,
    "utf-8"
  );
  try {
    const userCount = execSync(
      `node .check-users.mjs`,
      { cwd: ROOT, encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"], timeout: 15000 }
    ).trim();
    if (userCount === "0") {
      log("  No users found. Creating default admin account...", "yellow");
      run(`npx tsx scripts/setup-admin.js "admin@admin.com" "admin123"`);
      log(`  Default admin: admin@admin.com / admin123`, "green");
    } else {
      log(`  ${userCount} user(s) found, skipping admin creation.`, "green");
    }
  } catch (e) {
    log(`  Admin check failed (database may still be starting up): ${e.message}`, "yellow");
    log("  Run manually: node scripts/setup-admin.js <email> <password>", "yellow");
  } finally {
    try {
      rmSync(checkScript, { force: true });
    } catch { }
  }

  log("  Done.", "green");
  console.log("");

  // 5. Start dev server
  log("[5/5] Starting development server...", "yellow");

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
  log(`  MySQL:   localhost:${MYSQL_PORT} / root / rootpassword / wa_akg`, "cyan");
  console.log("");
  log("  Press Ctrl+C to stop.", "green");
  console.log("");

  const child = spawn("npm", ["run", "dev"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });

  const cleanup = () => {
    console.log("");
    log("Stopping MySQL container...", "yellow");
    try {
      execSync(`docker stop ${MYSQL_CONTAINER}`, { stdio: "ignore" });
    } catch { }
    log("Done.", "green");
  };

  process.on("SIGINT", () => {
    child.kill();
    cleanup();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    child.kill();
    cleanup();
    process.exit(0);
  });

  await new Promise(() => { }); // keep alive
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
