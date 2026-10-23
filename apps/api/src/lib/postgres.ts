/** Postgres error codes the application reacts to. */
const UNIQUE_VIOLATION = '23505';

const postgresCode = (error: unknown): string | undefined => {
  // drizzle wraps driver errors and keeps the original as `cause`.
  for (let current = error; current && typeof current === 'object'; current = (current as { cause?: unknown }).cause) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
  }
  return undefined;
};

export const isUniqueViolation = (error: unknown): boolean => postgresCode(error) === UNIQUE_VIOLATION;
