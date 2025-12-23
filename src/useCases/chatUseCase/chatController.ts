import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "genkit";
import { container } from "tsyringe";
import { ChatUseCase } from "./chatUseCase";

export class ChatController { 
  async handle(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({
      message: z.string(),
      sessionId: z.string().optional(),
    });

    const { message, sessionId } = bodySchema.parse(request.body);
    const useCase = container.resolve(ChatUseCase);
    const result = await useCase.execute(message, sessionId)

    reply.header('x-session-id', result.sessionId)
    reply.send(result.response)
  }
}