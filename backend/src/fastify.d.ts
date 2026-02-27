import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: { jwtVerify: () => Promise<void> },
      reply: { code: (statusCode: number) => { send: (payload: unknown) => void } }
    ) => Promise<void>;
    createAccessToken: (payload: { sub: string; email: string }) => string;
  }
}
