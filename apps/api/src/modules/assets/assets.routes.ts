import { ErrorCode } from '@itd/schema';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AppError } from '../../lib/errors';
import type { AuthService } from '../auth/auth.service';
import { authenticate } from '../auth/authenticate';
import { ACCEPTED_IMAGE_TYPES, type AssetsService } from './assets.service';

const UPLOAD_LIMIT_BYTES = 15 * 1024 * 1024;
const IdParams = z.object({ id: z.uuid() });

interface AssetRoutesOptions {
  auth: AuthService;
  assets: AssetsService;
}

/**
 * `POST /api/assets` takes the raw image as the request body (no multipart). `GET /api/assets/:id`
 * is public: ids are random UUIDs, and images must load in `<img>` tags that cannot send tokens.
 */
export const assetRoutes: FastifyPluginAsyncZod<AssetRoutesOptions> = async (app, { auth, assets }) => {
  app.addContentTypeParser(
    ACCEPTED_IMAGE_TYPES,
    { parseAs: 'buffer', bodyLimit: UPLOAD_LIMIT_BYTES },
    (_request, body, done) => done(null, body),
  );

  app.post(
    '/assets',
    { preHandler: authenticate(auth), bodyLimit: UPLOAD_LIMIT_BYTES, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
        throw new AppError(415, ErrorCode.validation, 'Ожидается изображение (JPEG, PNG, WebP, GIF или AVIF)');
      }
      return reply.status(201).send(await assets.upload(request.userId, request.body));
    },
  );

  app.get('/assets/:id', { schema: { params: IdParams } }, async (request, reply) => {
    const asset = await assets.get(request.params.id);
    return reply
      .header('content-type', asset.contentType)
      .header('cache-control', 'public, max-age=31536000, immutable')
      .header('x-content-type-options', 'nosniff')
      .send(asset.bytes);
  });

  app.delete('/assets/:id', { preHandler: authenticate(auth), schema: { params: IdParams } }, async (request, reply) => {
    await assets.remove(request.userId, request.params.id);
    return reply.status(204).send();
  });
};
