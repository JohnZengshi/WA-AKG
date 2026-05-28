#!/usr/bin/env node
// ==============================================
// WA-AKG Startup Script (cross-platform)
// ==============================================
// Prerequisites:
//   - Node.js >= 18
//   - Docker Desktop (for MySQL)
//   - .env file (already exists in project root)
// ==============================================
//
// Usage:
//   node start.mjs              # Full startup: env + app (backward compatible)
//   node start.mjs --app-only   # Start app only (restart dev server)
//   node start.mjs --env-only   # Environment setup only (MySQL, deps, schema)
//   node start.mjs --stop       # Stop environment (MySQL container)
//
// npm scripts (recommended):
//   npm run dev:env             # Environment (run once)
//   npm run dev:app             # App (restart as many times as needed)
//   npm run dev:stop            # Stop environment
// ==============================================

const args = process.argv.slice(2);

async function main() {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage:
  node start.mjs              Full startup: env setup + app (backward compatible)
  node start.mjs --app-only   Start app only (restart dev server)
  node start.mjs --env-only   Environment setup only (MySQL, deps, schema)
  node start.mjs --stop       Stop environment (MySQL container)

npm scripts (recommended):
  npm run dev:env             Environment (run once per dev session)
  npm run dev:app             App (restart as many times as needed)
  npm run dev:stop            Stop environment (MySQL container)
`);
    return;
  }

  if (args.includes("--env-only")) {
    await import("./scripts/dev-env.mjs");
    return;
  }

  if (args.includes("--app-only")) {
    const { startApp } = await import("./scripts/dev-app.mjs");
    await startApp();
    return;
  }

  if (args.includes("--stop")) {
    await import("./scripts/dev-stop.mjs");
    return;
  }

  // Default: env setup + app (backward compatible)
  await import("./scripts/dev-env.mjs");
  const { startApp } = await import("./scripts/dev-app.mjs");
  await startApp();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
