import { config as loadDotenv } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { ENV } from "./server/_core/env";

// Do not let a confirmation persisted in .env authorize schema writes.
const confirmedInShell = process.env.CONFIRM_NEON_MIGRATIONS === "1";
loadDotenv();

const connectionString = ENV.databaseUrl || undefined;
const databaseCommands = new Set(["migrate", "push", "studio", "introspect", "pull", "check"]);
const schemaWriteCommands = new Set(["migrate", "push"]);
const isDatabaseCommand = process.argv.some((argument) => databaseCommands.has(argument));
const isSchemaWriteCommand = process.argv.some((argument) => schemaWriteCommands.has(argument));

if (isSchemaWriteCommand && !confirmedInShell) {
  throw new Error("Set CONFIRM_NEON_MIGRATIONS=1 in the current shell to apply PostgreSQL schema changes.");
}

if (!connectionString && isDatabaseCommand) {
  throw new Error("Set NEON_DATABASE_URL or a PostgreSQL DATABASE_URL to apply or inspect database changes.");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/postgres",
  dialect: "postgresql",
  dbCredentials: {
    // `generate` only reads the schema; database commands require a valid PostgreSQL URL.
    url: connectionString ?? "postgres://localhost/valkor",
  },
});
