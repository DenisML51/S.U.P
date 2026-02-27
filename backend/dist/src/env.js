import { config } from 'dotenv';
import { z } from 'zod';
config();
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().min(1),
    APP_ORIGIN: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL_DAYS: z.coerce.number().default(30),
    REFRESH_COOKIE_NAME: z.string().default('itd_refresh'),
    EMAIL_VERIFICATION_REQUIRED: z
        .string()
        .transform((value) => value.toLowerCase() === 'true')
        .default('true'),
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM: z.string().email(),
    CHARACTER_DATA_KEY: z.string().min(44),
    ADMIN_API_KEY: z.string().optional()
});
export const env = envSchema.parse(process.env);
export const isProduction = env.NODE_ENV === 'production';
