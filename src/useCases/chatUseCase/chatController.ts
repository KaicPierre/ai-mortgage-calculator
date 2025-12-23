import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { container } from "tsyringe";
import { ChatUseCase } from "./chatUseCase";
import { logger, cropText } from "@shared/logger";
import { AppError } from "@shared/errors";

export class ChatController { 
  async handle(request: FastifyRequest, reply: FastifyReply) {
    const startTime = Date.now();
    const bodySchema = z.object({
      message: z.string(),
      sessionId: z.string().optional(),
    });

    const { message, sessionId } = bodySchema.parse(request.body);
    
    const useCase = container.resolve(ChatUseCase);
    const result = await useCase.execute(message, sessionId)
    
    const duration = Date.now() - startTime;
    
    logger.info({ 
      layer: 'Controller',
      method: 'handle',
      sessionId: result.sessionId,
      message: cropText(message),
      response: cropText(result.response),
      duration: `${duration}ms`
    }, 'Request processed successfully');
    
    reply.header('x-session-id', result.sessionId)
    reply.send(result.response)
  }
}