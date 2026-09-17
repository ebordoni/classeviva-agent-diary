const DEFAULTS = {
  maxPostsPerDay: 10,
  minIntervalMinutes: 5,
  maxAttempts: 3,
  port: 8080,
};

function parseBoolean(value) {
  return value === true || value === "true";
}

function parsePositiveInteger(value, name, fallback, max) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new Error(`${name} deve essere un numero intero tra 1 e ${max}`);
  }
  return parsed;
}

export function loadConfig(env = process.env) {
  const enabled = parseBoolean(env.PUBLISHER_ENABLED);
  const channelJid = (env.PUBLISHER_CHANNEL_JID ?? "").trim();
  const sharedSecret = env.PUBLISHER_SHARED_SECRET ?? "";
  const config = {
    enabled,
    channelJid,
    sharedSecret,
    maxPostsPerDay: parsePositiveInteger(
      env.PUBLISHER_MAX_POSTS_PER_DAY,
      "PUBLISHER_MAX_POSTS_PER_DAY",
      DEFAULTS.maxPostsPerDay,
      100,
    ),
    minIntervalMs:
      parsePositiveInteger(
        env.PUBLISHER_MIN_INTERVAL_MINUTES,
        "PUBLISHER_MIN_INTERVAL_MINUTES",
        DEFAULTS.minIntervalMinutes,
        1440,
      ) *
      60 *
      1000,
    maxAttempts: parsePositiveInteger(
      env.PUBLISHER_MAX_ATTEMPTS,
      "PUBLISHER_MAX_ATTEMPTS",
      DEFAULTS.maxAttempts,
      10,
    ),
    authDir: env.PUBLISHER_AUTH_DIR ?? "/data/whatsapp-auth",
    databasePath: env.PUBLISHER_DB_PATH ?? "/data/publisher.sqlite",
    port: parsePositiveInteger(env.PORT, "PORT", DEFAULTS.port, 65535),
  };

  if (enabled && !/^\d+@newsletter$/.test(channelJid)) {
    throw new Error("PUBLISHER_CHANNEL_JID deve terminare con @newsletter");
  }
  if (enabled && sharedSecret.length < 32) {
    throw new Error("PUBLISHER_SHARED_SECRET deve contenere almeno 32 caratteri");
  }

  return config;
}
