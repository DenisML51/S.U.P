import fp from 'fastify-plugin';
import { env } from '../env.js';
const authPlugin = async (app) => {
    app.decorate('authenticate', async (request, reply) => {
        try {
            await request.jwtVerify();
        }
        catch {
            reply.code(401).send({ message: 'Unauthorized' });
        }
    });
    app.decorate('createAccessToken', (payload) => app.jwt.sign(payload, { expiresIn: env.JWT_ACCESS_TTL }));
};
export const auth = fp(authPlugin);
