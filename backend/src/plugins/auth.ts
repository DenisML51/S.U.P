import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../env.js';

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorate(
    'authenticate',
    async (request: { jwtVerify: () => Promise<void> }, reply: { code: (statusCode: number) => { send: (payload: unknown) => void } }) => {
      try {
        await request.jwtVerify();
      } catch {
        reply.code(401).send({ message: 'Unauthorized' });
      }
    }
  );

  app.decorate('createAccessToken', (payload: { sub: string; email: string }) =>
    app.jwt.sign(payload, { expiresIn: env.JWT_ACCESS_TTL })
  );
};

export const auth = fp(authPlugin);
