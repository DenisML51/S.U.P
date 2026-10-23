import {
  CharacterIdParamsSchema,
  DeleteCharacterQuerySchema,
  PutCharacterRequestSchema,
  RevisionParamsSchema,
  SyncQuerySchema,
} from '@itd/schema';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { AuthService } from '../auth/auth.service';
import { authenticate, clientSessionId } from '../auth/authenticate';
import type { CharactersService } from './characters.service';

interface CharacterRoutesOptions {
  auth: AuthService;
  characters: CharactersService;
}

export const characterRoutes: FastifyPluginAsyncZod<CharacterRoutesOptions> = async (app, { auth, characters }) => {
  app.addHook('preHandler', authenticate(auth));

  app.get('/characters', { schema: { querystring: SyncQuerySchema } }, async (request) =>
    characters.pull(request.userId, BigInt(request.query.since)),
  );

  app.get('/characters/deleted', async (request) => characters.listDeleted(request.userId));

  app.get('/characters/:id', { schema: { params: CharacterIdParamsSchema } }, async (request) =>
    characters.get(request.userId, request.params.id),
  );

  app.put(
    '/characters/:id',
    { schema: { params: CharacterIdParamsSchema, body: PutCharacterRequestSchema } },
    async (request) =>
      characters.put(request.userId, request.params.id, request.body, clientSessionId(request)),
  );

  app.delete(
    '/characters/:id',
    { schema: { params: CharacterIdParamsSchema, querystring: DeleteCharacterQuerySchema } },
    async (request) =>
      characters.remove(request.userId, request.params.id, request.query.baseRevision, clientSessionId(request)),
  );

  app.post('/characters/:id/restore', { schema: { params: CharacterIdParamsSchema } }, async (request) =>
    characters.restore(request.userId, request.params.id, clientSessionId(request)),
  );

  app.get('/characters/:id/revisions', { schema: { params: CharacterIdParamsSchema } }, async (request) =>
    characters.listRevisions(request.userId, request.params.id),
  );

  app.get('/characters/:id/revisions/:revision', { schema: { params: RevisionParamsSchema } }, async (request) =>
    characters.getRevision(request.userId, request.params.id, request.params.revision),
  );
};
