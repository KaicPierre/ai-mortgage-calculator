import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {ChatController} from '@useCases/chatUseCase/chatController'

const chatController = new ChatController()


export async function mortgageCalculatorRoutes(app: FastifyInstance) {
  app.post('/chat', chatController.handle)
}
