#!/usr/bin/env node
// ==============================================
// WA-AKG Environment Setup (run once per dev session)
// ==============================================
// Starts PostgreSQL, installs deps, configures .env,
// pushes Prisma schema, creates default admin.
//
// Usage:   node scripts/dev-env.mjs
// ==============================================

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, rmSync, readdirSync } from "fs";
import path from "path";
import { log, run, isPortOpen, isPostgresPort, parseEnvPorts, ROOT } from "./dev-common.mjs";

const DB_CONTAINER = "wa-akg-db-dev";
const DB_DATA_DIR = path.join(ROOT, "data", "pg-dev");

async function waitForDocker() {
  for (let i = 0; i < 30; i++) {
    try {
      execSync(
        `docker exec ${DB_CONTAINER} pg_isready -U postgres`,
        { stdio: "ignore" }
      );
      return true;
    } catch { }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
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

export async function setupEnv() {
  const { DB_PORT, APP_PORT } = parseEnvPorts();

  console.log("");
  log("========================================", "cyan");
  log("  WA-AKG Environment Setup", "cyan");
  log("========================================", "cyan");
  console.log("");

  // --------------------------------------------------
  // 1. Check prerequisites
  // --------------------------------------------------
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
  // Auto-start Colima if installed but not running (macOS only via Colima)
  const colimaBin = process.platform === "win32" ? "where colima" : "which colima";
  try {
    execSync(colimaBin, { stdio: "pipe" });
    try {
      execSync("colima status", { stdio: "pipe" });
    } catch {
      log("  Colima is installed but not running. Starting Colima...", "yellow");
      execSync("colima start", { stdio: "inherit" });
      log("  Colima started.", "green");
    }
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

  // --------------------------------------------------
  // 2. Start PostgreSQL
  // --------------------------------------------------
  log("[2/5] Starting PostgreSQL via Docker...", "yellow");

  const port5432 = await isPortOpen(DB_PORT);
  let pgOnPort = false;
  if (port5432) {
    pgOnPort = await isPostgresPort(DB_PORT);
    if (pgOnPort) {
      log(`  PostgreSQL is already running on port ${DB_PORT}.`, "green");
    } else {
      log(`  Port ${DB_PORT} is in use by a non-PostgreSQL service. Will start our own PostgreSQL container.`, "yellow");
    }
  }

  if (pgOnPort) {
    // Real PostgreSQL is running externally — skip container creation entirely
  } else if (isDockerRunning(DB_CONTAINER)) {
    log("  PostgreSQL container already running.", "green");
  } else if (containerExists(DB_CONTAINER)) {
    log("  Starting existing PostgreSQL container...");
    execSync(`docker start ${DB_CONTAINER}`, { stdio: "ignore" });
    log("  Waiting for PostgreSQL to be ready...");
    const ready = await waitForDocker();
    if (!ready) {
      log("  Container failed to start (data may be corrupted). Recreating...", "yellow");
      execSync(`docker rm -f ${DB_CONTAINER}`, { stdio: "ignore" });
      // Fall through to create new container below
    } else {
      log("  PostgreSQL is ready.", "green");
    }
  }

  // Create PostgreSQL container (if it doesn't exist or was removed above)
  if (!isDockerRunning(DB_CONTAINER) && !pgOnPort) {
    try { execSync(`docker rm -f ${DB_CONTAINER}`, { stdio: "ignore" }); } catch { }

    // Check if image exists locally, pull if needed
    let imageExists = '';
    try {
      imageExists = execSync(`docker images -q postgres:16`, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
    } catch {
      imageExists = '';
    }
    if (!imageExists) {
      const registries = [
        "docker.io/library/postgres:16",
        "docker.m.daocloud.io/library/postgres:16",
        "mirror.ccs.tencentyun.com/library/postgres:16",
        "hub-mirror.c.163.com/library/postgres:16",
      ];

      let pulled = false;
      for (const registry of registries) {
        log(`  Pulling postgres:16 from ${registry.split("/")[0]}...`);
        try {
          execSync(`docker pull ${registry}`, { stdio: "inherit", timeout: 300000 });
          execSync(`docker tag ${registry} postgres:16`, { stdio: "ignore" });
          execSync(`docker rmi ${registry}`, { stdio: "ignore" });
          pulled = true;
          break;
        } catch {
          log(`  Failed, trying next mirror...`, "yellow");
          continue;
        }
      }

      if (!pulled) {
        log("  Failed to pull postgres:16 from all mirrors.", "red");
        log("  Try these steps manually:", "yellow");
        log("    1. Configure proxy: Docker Desktop → Settings → Resources → Proxies");
        log("    2. Or configure mirrors: Docker Desktop → Settings → Docker Engine → add registry-mirrors");
        log("    3. Or run: docker pull postgres:16");
        process.exit(1);
      }
    }

    run(
      `docker run -d ` +
      `--name ${DB_CONTAINER} ` +
      `-e POSTGRES_PASSWORD=postgres ` +
      `-e POSTGRES_DB=wa_akg ` +
      `-e POSTGRES_USER=postgres ` +
      `-v "${DB_DATA_DIR}:/var/lib/postgresql/data" ` +
      `-p ${DB_PORT}:5432 ` +
      `postgres:16`
    );

    log("  Waiting for PostgreSQL to be ready...");
    const ready = await waitForDocker();
    if (!ready) {
      const logs = execSync(`docker logs ${DB_CONTAINER} 2>&1`, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] });
      log("  PostgreSQL failed to start. Check 'docker logs " + DB_CONTAINER + "'", "red");
      process.exit(1);
    }
    log("  PostgreSQL is ready.", "green");
  }
  console.log("");

  // --------------------------------------------------
  // 3. Install dependencies
  // --------------------------------------------------
  log("[3/5] Installing dependencies...", "yellow");
  run("npm install --legacy-peer-deps");
  log("  Done.", "green");
  console.log("");

  // --------------------------------------------------
  // 3.5. Ensure .env with correct DATABASE_URL, PORT, BASE_URL
  // --------------------------------------------------
  const envPath = path.join(ROOT, ".env");
  const envExamplePath = path.join(ROOT, ".env.example");
  const dbUrlLine = `DATABASE_URL="postgresql://postgres:postgres@localhost:${DB_PORT}/wa_akg?schema=public"`;
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
        `# Auto-generated by dev-env.mjs — DO NOT EDIT DIRECTLY\n${dbUrlLine}\n${portLine}\n${baseUrlLine}\n\n# === From .env.example ===\n${filteredLines}`,
        "utf-8"
      );
    } else {
      writeFileSync(envPath, `${dbUrlLine}\n${portLine}\n${baseUrlLine}\n`, "utf-8");
    }
    log("  .env created.", "green");
  } else {
    let updated = readFileSync(envPath, "utf-8");
    let changed = false;

    const dbMatch = updated.match(/^DATABASE_URL="postgresql:.*"/m);
    if (dbMatch && dbMatch[0] !== dbUrlLine) {
      updated = updated.replace(/^DATABASE_URL="postgresql:.*"/m, dbUrlLine);
      changed = true;
    } else if (!dbMatch) {
      updated = `${dbUrlLine}\n${updated}`;
      changed = true;
    }

    const portMatch = updated.match(/^PORT\s*=\s*"?(\d+)"?/m);
    if (portMatch && portMatch[0] !== `PORT=${APP_PORT}` && portMatch[0] !== `PORT="${APP_PORT}"`) {
      updated = updated.replace(/^PORT\s*=\s*"?\d+"?/m, portLine);
      changed = true;
    } else if (!portMatch) {
      updated = `${portLine}\n${updated}`;
      changed = true;
    }

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
      log(`  .env updated: DATABASE_URL port=${DB_PORT}, PORT=${APP_PORT}, BASE_URL=${APP_PORT}.`, "yellow");
    } else {
      log("[3.5/5] .env is correct.", "green");
    }
  }
  console.log("");

  // --------------------------------------------------
  // 4. Database schema + admin
  // --------------------------------------------------
  log("[4/5] Setting up database schema...", "yellow");
  run("npx prisma db push --accept-data-loss");

  const prismaClientDir = path.join(ROOT, "node_modules", ".prisma", "client");
  try {
    execSync("npx prisma generate", { cwd: ROOT, stdio: "pipe", timeout: 120000 });
    log("  prisma generate done.", "green");
  } catch {
    const engineExists = existsSync(prismaClientDir) && readdirSync(prismaClientDir).some(f => f.endsWith(".dll.node") || f.endsWith(".so.node"));
    if (engineExists) {
      log("  prisma generate skipped (EPERM suppressed, existing engine is valid).", "yellow");
    } else {
      log("  prisma generate failed, retrying once...", "yellow");
      run("npx prisma generate");
      log("  prisma generate done.", "green");
    }
  }

  // Create default admin if database is fresh
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
    try { rmSync(checkScript, { force: true }); } catch { }
  }

  log("  Done.", "green");
  console.log("");

  log("========================================", "cyan");
  log("  Environment ready! Now run:", "cyan");
  log(`    npm run dev:app`, "cyan");
  log("  or", "cyan");
  log(`    node start.mjs`, "cyan");
  log("  or", "cyan");
  log(`    node scripts/dev-app.mjs`, "cyan");
  log("========================================", "cyan");
  console.log("");
}

// Run directly
setupEnv().catch((e) => {
  console.error(e);
  process.exit(1);
});
