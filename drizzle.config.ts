import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
const databaseCommands = new Set(["migrate", "push", "studio", "introspect", "pull", "check"]);
const isDatabaseCommand = process.argv.some((argument) => databaseCommands.has(argument));

if (!connectionString && isDatabaseCommand) {
  throw new Error("DATABASE_URL is required to apply or inspect database changes; use a PostgreSQL connection string.");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/postgres",
  dialect: "postgresql",
  dbCredentials: {
    // `generate` only reads the schema; migrations require a user-supplied DATABASE_URL.
    url: connectionString ?? "postgres://localhost/valkor",
  },
});
