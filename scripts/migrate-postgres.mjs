import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";

// Capture confirmation before .env is loaded so a persistent .env value cannot authorize a migration.
const confirmedInShell = process.env.CONFIRM_NEON_MIGRATIONS === "1";
loadDotenv();

function isPostgresUrl(value) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "postgres:" || parsed.protocol === "postgresql:") && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function redactOutput(text) {
  let result = text;
  for (const candidate of [process.env.NEON_DATABASE_URL, process.env.DATABASE_URL]) {
    const connectionString = candidate?.trim();
    if (!connectionString) continue;
    result = result.replaceAll(connectionString, "[REDACTED DATABASE URL]");
    try {
      const password = new URL(connectionString).password;
      for (const secret of [password, decodeURIComponent(password)]) {
        if (secret) result = result.replaceAll(secret, "[REDACTED]");
      }
    } catch {
      // The connection string is still redacted exactly above.
    }
  }
  return result;
}

function runMigration() {
  if (!confirmedInShell) {
    console.error("Migration blocked. Set CONFIRM_NEON_MIGRATIONS=1 in the current shell only when you intentionally approve applying migrations.");
    return 1;
  }

  const connectionString = process.env.NEON_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!isPostgresUrl(connectionString)) {
    console.error("Migration blocked. Set NEON_DATABASE_URL, or set DATABASE_URL to a valid PostgreSQL URL.");
    return 1;
  }

  const drizzleCli = fileURLToPath(new URL("../node_modules/drizzle-kit/bin.cjs", import.meta.url));
  const result = spawnSync(process.execPath, [drizzleCli, "migrate"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });

  if (result.stdout) process.stdout.write(redactOutput(result.stdout));
  if (result.stderr) process.stderr.write(redactOutput(result.stderr));
  if (result.error) {
    console.error("Migration stopped because Drizzle Kit could not be started.");
    return 1;
  }
  return result.status ?? 1;
}

process.exitCode = runMigration();
