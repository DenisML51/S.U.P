import { z } from 'zod';
import { prisma } from '../prisma.js';
import { decryptJson, encryptJson } from '../utils/crypto.js';
const characterPayloadSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    class: z.string().min(1),
    level: z.number().int().min(1),
    data: z.record(z.any())
});
export const characterRoutes = async (app) => {
    app.get('/characters', { preHandler: [app.authenticate] }, async (request) => {
        const userId = request.user.sub;
        const rows = await prisma.character.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            select: { id: true, encryptedPayload: true, payloadIv: true, payloadTag: true }
        });
        const characters = rows.map((row) => {
            const data = decryptJson(row.encryptedPayload, row.payloadIv, row.payloadTag);
            return {
                id: String(data.id ?? row.id),
                name: String(data.name ?? ''),
                class: String(data.class ?? ''),
                subclass: String(data.subclass ?? ''),
                level: Number(data.level ?? 1),
                currentHP: Number(data.currentHP ?? 0),
                maxHP: Number(data.maxHP ?? 0),
                avatar: typeof data.avatar === 'string' ? data.avatar : undefined,
                resistances: Array.isArray(data.resistances) ? data.resistances : []
            };
        });
        return { characters };
    });
    app.get('/characters/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
        const userId = request.user.sub;
        const { id } = request.params;
        const row = await prisma.character.findFirst({ where: { id, userId } });
        if (!row) {
            return reply.code(404).send({ message: 'Character not found' });
        }
        const data = decryptJson(row.encryptedPayload, row.payloadIv, row.payloadTag);
        return { character: data };
    });
    app.post('/characters', { preHandler: [app.authenticate] }, async (request, reply) => {
        const parsed = characterPayloadSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ message: 'Invalid payload' });
        }
        const userId = request.user.sub;
        const { id, name, class: className, level, data } = parsed.data;
        const encrypted = encryptJson(data);
        const created = await prisma.character.create({
            data: {
                ...(id ? { id } : {}),
                userId,
                name,
                class: className,
                level,
                ...encrypted
            },
            select: { id: true, name: true, class: true, level: true, createdAt: true, updatedAt: true }
        });
        return reply.code(201).send({ character: created });
    });
    app.put('/characters/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
        const parsed = characterPayloadSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ message: 'Invalid payload' });
        }
        const userId = request.user.sub;
        const { id } = request.params;
        const exists = await prisma.character.findFirst({ where: { id, userId }, select: { id: true } });
        if (!exists) {
            return reply.code(404).send({ message: 'Character not found' });
        }
        const { name, class: className, level, data } = parsed.data;
        const encrypted = encryptJson(data);
        const updated = await prisma.character.update({
            where: { id },
            data: {
                name,
                class: className,
                level,
                ...encrypted
            },
            select: { id: true, name: true, class: true, level: true, createdAt: true, updatedAt: true }
        });
        return { character: updated };
    });
    app.delete('/characters/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
        const userId = request.user.sub;
        const { id } = request.params;
        const deleted = await prisma.character.deleteMany({ where: { id, userId } });
        if (!deleted.count) {
            return reply.code(404).send({ message: 'Character not found' });
        }
        return { ok: true };
    });
};
