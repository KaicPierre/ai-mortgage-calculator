import 'reflect-metadata';
import './shared/dependencyInjection';

import Fastify from 'fastify';

import 'dotenv/config';
import { ZodError, z } from 'zod';

import cors from '@fastify/cors';

import { env } from '@env/index';
import { AppError } from '@shared/errors';
import { logger } from '@shared/logger';

import { mortgageCalculatorRoutes } from './routes';

const fastify = Fastify({
  logger: false,
  disableRequestLogging: true,
});

const start = async () => {
  try {
    logger.info(
      {
        layer: 'Server',
        port: env.APP_PORT,
        host: '0.0.0.0',
      },
      'Starting application',
    );

    fastify.register(cors, {
      origin: '*',
      exposedHeaders: ['x-session-id'],
    });
    fastify.register(mortgageCalculatorRoutes);

    fastify.setErrorHandler((error, request, reply) => {
      if (error instanceof ZodError) {
        logger.error(
          {
            layer: 'Server',
            error: z.treeifyError(error),
          },
          'Validation Error',
        );

        return reply.status(400).send({
          message: 'Validation error',
          issues: z.treeifyError(error),
        });
      }

      if (error instanceof AppError) {
        logger.error(
          {
            layer: 'Server',
            ...error,
          },
          'Application Error',
        );

        return reply.status(error.statusCode).send({
          code: error.statusCode,
          message: error.message,
          cause: error.cause,
          isOperational: error.isOperational,
        });
      }

      return reply.status(500).send({
        message: 'Internal server error',
      });
    });

    await fastify.listen({ host: '0.0.0.0', port: env.APP_PORT });

    logger.info(
      {
        layer: 'Server',
        port: env.APP_PORT,
        host: '0.0.0.0',
      },
      'Application started successfully',
    );
  } catch (err) {
    logger.error(
      {
        layer: 'Server',
        error: err instanceof Error ? err.message : String(err),
      },
      'Failed to start application',
    );
    process.exit(1);
  }
};

start();
