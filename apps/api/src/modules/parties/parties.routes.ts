import {
  AddCombatantsRequestSchema,
  AddPartyHeroRequestSchema,
  CombatantParamsSchema,
  CreateNpcRequestSchema,
  CreatePartyRequestSchema,
  InitiativeRequestSchema,
  InviteParamsSchema,
  MessagesQuerySchema,
  NextTurnRequestSchema,
  PartyHeroParamsSchema,
  PartyMemberParamsSchema,
  PartyNpcParamsSchema,
  PartyParamsSchema,
  SendMessageRequestSchema,
  StartCombatRequestSchema,
  UpdateNpcRequestSchema,
  UpdatePartyRequestSchema,
} from '@itd/schema';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { AuthService } from '../auth/auth.service';
import { authenticate } from '../auth/authenticate';
import type { CombatService } from './combat.service';
import type { MessagesService } from './messages.service';
import type { PartyQueries } from './parties.queries';
import type { PartiesService } from './parties.service';

interface PartyRoutesOptions {
  auth: AuthService;
  parties: PartiesService;
  combat: CombatService;
  queries: PartyQueries;
  messages: MessagesService;
}

/** Invite codes are guessable only by brute force; keep that slow. */
const INVITE_RATE_LIMIT = { rateLimit: { max: 20, timeWindow: '1 minute' } };

/**
 * Party API. Changes answer `204` (or the new id) and announce `party.changed` over the socket;
 * every member then fetches `GET /parties/:id`, which is tailored to who is asking.
 */
export const partyRoutes: FastifyPluginAsyncZod<PartyRoutesOptions> = async (app, { auth, parties, combat, queries, messages }) => {
  app.addHook('preHandler', authenticate(auth));

  // --- Parties --------------------------------------------------------------------------------

  app.get('/parties', async (request) => queries.list(request.userId));

  app.post('/parties', { schema: { body: CreatePartyRequestSchema } }, async (request, reply) =>
    reply.status(201).send(await parties.create(request.userId, request.body)),
  );

  app.get('/parties/:id', { schema: { params: PartyParamsSchema } }, async (request) =>
    queries.view(request.userId, request.params.id),
  );

  app.patch('/parties/:id', { schema: { params: PartyParamsSchema, body: UpdatePartyRequestSchema } }, async (request, reply) => {
    await parties.update(request.userId, request.params.id, request.body);
    return reply.status(204).send();
  });

  app.delete('/parties/:id', { schema: { params: PartyParamsSchema } }, async (request, reply) => {
    await parties.remove(request.userId, request.params.id);
    return reply.status(204).send();
  });

  app.post('/parties/:id/invite', { schema: { params: PartyParamsSchema } }, async (request, reply) => {
    await parties.regenerateInvite(request.userId, request.params.id);
    return reply.status(204).send();
  });

  // --- Invites --------------------------------------------------------------------------------

  app.get('/invites/:code', { schema: { params: InviteParamsSchema }, config: INVITE_RATE_LIMIT }, async (request) =>
    queries.invitePreview(request.userId, request.params.code),
  );

  app.post('/invites/:code/accept', { schema: { params: InviteParamsSchema }, config: INVITE_RATE_LIMIT }, async (request) =>
    parties.join(request.userId, request.params.code),
  );

  app.delete('/parties/:id/members/:userId', { schema: { params: PartyMemberParamsSchema } }, async (request, reply) => {
    await parties.removeMember(request.userId, request.params.id, request.params.userId);
    return reply.status(204).send();
  });

  // --- Heroes and NPCs ------------------------------------------------------------------------

  app.post('/parties/:id/heroes', { schema: { params: PartyParamsSchema, body: AddPartyHeroRequestSchema } }, async (request, reply) =>
    reply.status(201).send(await parties.addHero(request.userId, request.params.id, request.body.characterId)),
  );

  app.delete('/parties/:id/heroes/:heroId', { schema: { params: PartyHeroParamsSchema } }, async (request, reply) => {
    await parties.removeHero(request.userId, request.params.id, request.params.heroId);
    return reply.status(204).send();
  });

  app.post('/parties/:id/npcs', { schema: { params: PartyParamsSchema, body: CreateNpcRequestSchema } }, async (request, reply) =>
    reply.status(201).send(await parties.createNpc(request.userId, request.params.id, request.body)),
  );

  app.patch('/parties/:id/npcs/:npcId', { schema: { params: PartyNpcParamsSchema, body: UpdateNpcRequestSchema } }, async (request, reply) => {
    await parties.updateNpc(request.userId, request.params.id, request.params.npcId, request.body);
    return reply.status(204).send();
  });

  app.delete('/parties/:id/npcs/:npcId', { schema: { params: PartyNpcParamsSchema } }, async (request, reply) => {
    await parties.removeNpc(request.userId, request.params.id, request.params.npcId);
    return reply.status(204).send();
  });

  // --- Table talk ---------------------------------------------------------------------------

  app.get('/parties/:id/messages', { schema: { params: PartyParamsSchema, querystring: MessagesQuerySchema } }, async (request) =>
    messages.list(request.userId, request.params.id, request.query.before, request.query.limit),
  );

  app.post(
    '/parties/:id/messages',
    { schema: { params: PartyParamsSchema, body: SendMessageRequestSchema }, config: { rateLimit: { max: 40, timeWindow: '1 minute' } } },
    async (request, reply) => reply.status(201).send(await messages.send(request.userId, request.params.id, request.body)),
  );

  // --- Combat ---------------------------------------------------------------------------------

  app.post('/parties/:id/combat', { schema: { params: PartyParamsSchema, body: StartCombatRequestSchema } }, async (request, reply) => {
    await combat.start(request.userId, request.params.id, request.body);
    return reply.status(204).send();
  });

  app.delete('/parties/:id/combat', { schema: { params: PartyParamsSchema } }, async (request, reply) => {
    await combat.end(request.userId, request.params.id);
    return reply.status(204).send();
  });

  app.post(
    '/parties/:id/combat/combatants',
    { schema: { params: PartyParamsSchema, body: AddCombatantsRequestSchema } },
    async (request, reply) => {
      await combat.add(request.userId, request.params.id, request.body);
      return reply.status(204).send();
    },
  );

  app.delete('/parties/:id/combat/combatants/:combatantId', { schema: { params: CombatantParamsSchema } }, async (request, reply) => {
    await combat.remove(request.userId, request.params.id, request.params.combatantId);
    return reply.status(204).send();
  });

  app.put(
    '/parties/:id/combat/combatants/:combatantId/initiative',
    { schema: { params: CombatantParamsSchema, body: InitiativeRequestSchema } },
    async (request, reply) => {
      await combat.setInitiative(request.userId, request.params.id, request.params.combatantId, request.body.value);
      return reply.status(204).send();
    },
  );

  app.post('/parties/:id/combat/roll-npcs', { schema: { params: PartyParamsSchema } }, async (request, reply) => {
    await combat.rollForNpcs(request.userId, request.params.id);
    return reply.status(204).send();
  });

  app.post('/parties/:id/combat/begin', { schema: { params: PartyParamsSchema } }, async (request, reply) => {
    await combat.begin(request.userId, request.params.id);
    return reply.status(204).send();
  });

  app.post('/parties/:id/combat/next', { schema: { params: PartyParamsSchema, body: NextTurnRequestSchema } }, async (request, reply) => {
    await combat.next(request.userId, request.params.id, request.body.from);
    return reply.status(204).send();
  });
};
