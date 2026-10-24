import { ErrorCode, type ErrorResponse } from '@itd/schema';
import type { FastifyError, FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

/** An expected failure that maps to an HTTP response; anything else is a 500. */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const unauthorized = (message = 'Требуется вход') => new AppError(401, ErrorCode.unauthorized, message);
export const forbidden = (message = 'Доступ запрещён') => new AppError(403, ErrorCode.forbidden, message);
export const notFound = (message = 'Не найдено') => new AppError(404, ErrorCode.notFound, message);
/** The request is valid but clashes with the current state ("already in another party", "no seats left"). */
export const conflictError = (message: string) => new AppError(409, ErrorCode.conflict, message);
export const validationError = (message: string, details?: Record<string, unknown>) =>
  new AppError(400, ErrorCode.validation, message, details);

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    if (error instanceof AppError) {
      const body: ErrorResponse = { error: error.code, message: error.message, ...error.details };
      return reply.status(error.statusCode).send(body);
    }

    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        error: ErrorCode.validation,
        message: 'Некорректный запрос',
        details: error.validation.map((issue) => ({
          path: issue.instancePath,
          message: issue.message,
        })),
      } satisfies ErrorResponse);
    }

    if (error.statusCode === 429) {
      return reply
        .status(429)
        .send({ error: ErrorCode.rateLimited, message: 'Слишком много запросов, попробуйте позже' } satisfies ErrorResponse);
    }
    if (error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return reply
        .status(413)
        .send({ error: ErrorCode.payloadTooLarge, message: 'Слишком большой запрос' } satisfies ErrorResponse);
    }
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return reply
        .status(error.statusCode)
        .send({ error: ErrorCode.validation, message: error.message } satisfies ErrorResponse);
    }

    request.log.error({ err: error }, 'unhandled error');
    return reply
      .status(500)
      .send({ error: ErrorCode.internal, message: 'Внутренняя ошибка сервера' } satisfies ErrorResponse);
  });

  app.setNotFoundHandler((request, reply) =>
    reply
      .status(404)
      .send({ error: ErrorCode.notFound, message: `Маршрут ${request.method} ${request.url} не найден` } satisfies ErrorResponse),
  );
}
