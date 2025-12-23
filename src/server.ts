import 'reflect-metadata'
import './shared/dependencyInjection'

import Fastify from 'fastify';
import 'dotenv/config';

import { mortgageCalculatorRoutes } from './routes'
import { env } from '@env/index';
 
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


const start = async () => {
  try {
    fastify.register(mortgageCalculatorRoutes)
    await fastify.listen({ host: '0.0.0.0', port: env.APP_PORT });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
