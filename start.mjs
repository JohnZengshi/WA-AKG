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
import { existsSync } from "fs";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname);
const MYSQL_CONTAINER = "wa-akg-db";

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
    } catch {}
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
  console.log("");

  // 2. Start MySQL
  log("[2/5] Starting MySQL via Docker...", "yellow");

  const port3306 = await isPortOpen(3306);
  if (port3306) {
    log("  MySQL is already running on port 3306.", "green");
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
  if (!isDockerRunning(MYSQL_CONTAINER) && !port3306) {
    try { execSync(`docker rm -f ${MYSQL_CONTAINER}`, { stdio: "ignore" }); } catch {}

    // Check if image exists locally, pull if needed
    const imageExists = execSync(`docker images -q mysql:8.0`, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
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
        `-v "${ROOT}\\data\\mysql:/var/lib/mysql" ` +
        `-p 3306:3306 ` +
        `mysql:8.0`
    );

    log("  Waiting for MySQL to be ready...");
    const ready = await waitForDocker("rootpassword");
    if (!ready) {
      log("  MySQL failed to start. Check 'docker logs " + MYSQL_CONTAINER + "'", "red");
      process.exit(1);
    }
    log("  MySQL is ready.", "green");
  }
  console.log("");

  // 3. Install dependencies
  log("[3/5] Installing dependencies...", "yellow");
  run("npm install --legacy-peer-deps");
  log("  Done.", "green");
  console.log("");

  // 4. Database schema
  log("[4/5] Setting up database schema...", "yellow");
  run("npx prisma db push --accept-data-loss");
  run("npx prisma generate");

  // If database is fresh (no users), create default admin
  try {
    const userCount = execSync(
      `node -e "const{PrismaClient}=require(process.cwd()+'/node_modules/@prisma/client');const p=new PrismaClient();p.user.count().then(c=>{console.log(c);p.\$disconnect()})"`,
      { cwd: ROOT, encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
    ).trim();
    if (userCount === "0") {
      log("  No users found. Creating default admin account...", "yellow");
      run(`npx tsx scripts/setup-admin.js "admin@admin.com" "admin123"`);
      log(`  Default admin: admin@admin.com / admin123`, "green");
    }
  } catch {
    // Ignore check errors
  }

  log("  Done.", "green");
  console.log("");

  // 5. Start dev server
  log("[5/5] Starting development server...", "yellow");
  console.log("");
  log("  App:     http://localhost:3000", "cyan");
  log("  Swagger: http://localhost:3000/swagger", "cyan");
  log("  MySQL:   localhost:3306 / root / rootpassword / wa_akg", "cyan");
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
    } catch {}
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

  await new Promise(() => {}); // keep alive
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
