import { spawnSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function run(args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

await rm(new URL("../dist", import.meta.url), { recursive: true, force: true });
await mkdir(new URL("../dist", import.meta.url), { recursive: true });

run([
  "exec",
  "esbuild",
  "server/_core/vercel-entry.ts",
  "--bundle",
  "--platform=node",
  "--packages=external",
  "--format=esm",
  "--target=node22",
  "--outfile=dist/vercel-entry.js",
]);
run(["exec", "vite", "build"]);
