import "dotenv/config";
import express from "express";
import path from "node:path";
import type { Server } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

type CreateAppOptions = {
  /** HTTP server is required only when starting Vite's development middleware. */
  server?: Server;
  /** Set false when Vercel serves the client build separately from this API function. */
  serveFrontend?: boolean;
};

export async function createApp(options: CreateAppOptions = {}) {
  const app = express();

  // Configure body parser with larger size limit for file uploads.
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/manus-routes.json", (_req, res) => {
    res
      .set("Cache-Control", "no-store")
      .type("application/json")
      .sendFile(path.resolve(process.cwd(), "public/manus-routes.json"));
  });
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });

  registerOAuthRoutes(app);

  // tRPC API.
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    if (!options.server) {
      throw new Error("An HTTP server is required for the Vite development middleware.");
    }
    await setupVite(app, options.server);
  } else if (options.serveFrontend !== false) {
    serveStatic(app);
  }

  return app;
}
