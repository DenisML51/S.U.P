import type { FastifyRequest } from 'fastify';

export type JwtUser = {
  sub: string;
  email: string;
};

export type AuthenticatedRequest = FastifyRequest & {
  user: JwtUser;
};
