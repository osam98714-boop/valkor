import type { Request, Response } from "express";
import { createApp } from "./app";
import { restoreVercelApiRequestUrl } from "./vercelApiPath";

const appPromise = createApp({ serveFrontend: false });

export default async function handler(req: Request, res: Response) {
  try {
    req.url = restoreVercelApiRequestUrl(req.url ?? "/");
  } catch {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Invalid API path." }));
    return;
  }

  const app = await appPromise;
  return app(req, res);
}
