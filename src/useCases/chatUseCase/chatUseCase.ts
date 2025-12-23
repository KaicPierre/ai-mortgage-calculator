import { inject, injectable } from 'tsyringe';
import { v4 } from 'uuid';

import type { IGenAiRepository } from '@repositories/interfaces';
import { logger, cropText } from '@shared/logger';

@injectable()
export class ChatUseCase {
  constructor(
    @inject('GenAiRepository')
    private genAiRepository: IGenAiRepository,
  ) {}

  async execute(message: string, sessionId?: string) {
    const isNewSession = !sessionId;

    try {
      const history = sessionId ? this.genAiRepository.getHistory(sessionId) : undefined;

      if (!history) {
        sessionId = v4();
        const response = await this.genAiRepository.invoke(message);
        this.genAiRepository.setHistory({
          sessionId,
          messages: [
            { role: 'user', message },
            { role: 'model', message: response },
          ],
        });

        logger.info(
          {
            layer: 'UseCase',
            method: 'execute',
            sessionId,
            isNewSession: true,
            message: cropText(message),
            response: cropText(response),
          },
          'Chat execution completed',
        );

        return { response, sessionId };
      }

      const response = await this.genAiRepository.invoke(message, history);
      this.genAiRepository.setHistory({
        sessionId: sessionId as string,
        messages: [
          { role: 'user', message },
          { role: 'model', message: response },
        ],
      });

      logger.info(
        {
          layer: 'UseCase',
          method: 'execute',
          sessionId,
          isNewSession: false,
          message: cropText(message),
          response: cropText(response),
        },
        'Chat execution completed',
      );

      return { response, sessionId };
    } catch (error) {
      logger.error(
        {
          layer: 'UseCase',
          method: 'execute',
          sessionId: sessionId || 'none',
          isNewSession,
          error: error instanceof Error ? error.message : String(error),
        },
        'Chat execution failed',
      );
      throw error;
    }
  }
}
