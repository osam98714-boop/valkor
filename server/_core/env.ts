// Platform values are read at use time. See the Webdev service/authentication skills.
export function resolvePostgresDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const connectionString = env.NEON_DATABASE_URL?.trim() || env.DATABASE_URL?.trim();
  if (!connectionString) return undefined;

  try {
    const parsed = new URL(connectionString);
    if ((parsed.protocol === "postgres:" || parsed.protocol === "postgresql:") && parsed.hostname) {
      return connectionString;
    }
  } catch {
    // Reject malformed URLs without logging connection details.
  }

  return undefined;
}

export const ENV = {
  get appId() { return process.env.MANUS_PROJECT_ID ?? ""; },
  get cookieSecret() { return process.env.MANUS_JWT_SECRET ?? ""; },
  get databaseUrl() { return resolvePostgresDatabaseUrl() ?? ""; },
  get oAuthServerUrl() { return process.env.MANUS_OAUTH_API_URL ?? ""; },
  // Preserve the legacy hint when supplied; otherwise roles remain application data.
  get ownerOpenId() { return process.env.OWNER_OPEN_ID ?? ""; },
  get isProduction() { return process.env.NODE_ENV === "production"; },
  get forgeApiUrl() { return process.env.MANUS_API_URL ?? ""; },
  get forgeApiKey() { return process.env.MANUS_API_KEY ?? ""; },
};
