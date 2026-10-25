import { z } from 'zod';

const booleanFlag = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

    DATABASE_URL: z.string().url(),
    DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),

    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).default(15 * 60),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).default(30),
    /** Defaults to true in production; set to false only for plain-HTTP local setups. */
    COOKIE_SECURE: booleanFlag.optional(),

    /** Allow self-service sign-up. When off, accounts are created with the `create-user` CLI. */
    REGISTRATION_ENABLED: booleanFlag.default(true),
    RATE_LIMIT_ENABLED: booleanFlag.default(true),
    /**
     * Proxies in front of the API whose X-Forwarded-* headers are trusted: a hop count (`1` for the
     * web container's nginx, `2` with a TLS proxy before it). The client's address is the one the
     * outermost trusted proxy saw, so a made-up X-Forwarded-For cannot dodge the rate limits.
     * `true` trusts every hop (only when the outermost proxy overwrites the header); `false` none.
     */
    TRUST_PROXY: z
      .union([z.enum(['true', 'false']), z.coerce.number().int().min(0).max(10)])
      .transform((value) => (value === 'true' ? true : value === 'false' || value === 0 ? false : value))
      .default(false),
    /** Comma-separated origins allowed to call the API cross-origin. Not needed behind the web proxy. */
    CORS_ORIGINS: z.string().optional(),
  })
  .transform((env) => ({
    ...env,
    COOKIE_SECURE: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
    CORS_ORIGINS: env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? [],
  }));

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
