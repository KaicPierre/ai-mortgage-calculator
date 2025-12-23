import Fastify from 'fastify';
const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

fastify.get('/', async function handler(request, reply) {
  return { hello: 'world' };
});

const start = async () => {
  try {
    await fastify.listen({ host: '0.0.0.0', port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
