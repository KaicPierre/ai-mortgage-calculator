import type { FastifyReply, FastifyRequest } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';

import { logger, cropText } from '@shared/logger';

import { ChatUseCase } from './chatUseCase';

export class ChatController {
  async handle(request: FastifyRequest, reply: FastifyReply) {
    const startTime = Date.now();

    const bodySchema = z.object({
      message: z.string().optional(),
      sessionId: z.string().optional(),
      approval: z
        .object({
          approved: z.boolean(),
        })
        .optional(),
    });

    const { message, sessionId, approval } = bodySchema.parse(request.body);

    if (!message && !approval) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Either message or approval is required',
      });
    }

    if (approval && !sessionId) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'sessionId is required when providing approval',
      });
    }

    const useCase = container.resolve(ChatUseCase);
    const result = await useCase.execute(message || '', sessionId, approval);

    const duration = Date.now() - startTime;

    logger.info(
      {
        layer: 'Controller',
        method: 'handle',
        sessionId: result.sessionId,
        message: message ? cropText(message) : 'approval',
        response: cropText(result.response),
        requiresApproval: result.requiresApproval,
        duration: `${duration}ms`,
      },
      'Request processed successfully',
    );

    reply.header('x-session-id', result.sessionId);
    return reply.send({
      response: result.response,
      sessionId: result.sessionId,
      requiresApproval: result.requiresApproval,
      pendingCalculation: result.pendingCalculation,
    });
  }
}
