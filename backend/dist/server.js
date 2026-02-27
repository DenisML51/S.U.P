import { buildApp } from './app.js';
import { env } from './env.js';
import { prisma } from './prisma.js';
const app = buildApp();
const bootstrap = async () => {
    try {
        await app.listen({ host: '0.0.0.0', port: env.PORT });
    }
    catch (error) {
        app.log.error(error);
        process.exit(1);
    }
};
bootstrap();
const shutdown = async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
