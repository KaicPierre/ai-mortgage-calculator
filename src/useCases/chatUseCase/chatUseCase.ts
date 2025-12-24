import { inject, injectable } from 'tsyringe';
import { v4 } from 'uuid';

import type { IGenAiRepository } from '@repositories/interfaces';
import { logger, cropText } from '@shared/logger';

export interface IChatUseCaseResult {
  response: string;
  sessionId: string;
  requiresApproval: boolean;
  pendingCalculation?: Record<string, unknown>;
}

export interface IApprovalInput {
  approved: boolean;
}

@injectable()
export class ChatUseCase {
  constructor(
    @inject('GenAiRepository')
    private genAiRepository: IGenAiRepository,
  ) {}

  async execute(
    message: string,
    sessionId?: string,
    approval?: IApprovalInput,
  ): Promise<IChatUseCaseResult> {
    const isNewSession = !sessionId;

    try {
      // Handle approval flow
      if (approval && sessionId) {
        const result = await this.genAiRepository.resumeWithApproval(sessionId, approval.approved);

        const approvalMessage = approval.approved ? 'Yes, proceed with the calculation' : 'No, cancel the calculation';
        this.genAiRepository.setHistory({
          sessionId,
          messages: [
            { role: 'user', message: approvalMessage },
            { role: 'model', message: result.response },
          ],
        });

        logger.info(
          {
            layer: 'UseCase',
            method: 'execute',
            sessionId,
            approved: approval.approved,
            response: cropText(result.response),
          },
          'Approval processed successfully',
        );

        return {
          response: result.response,
          sessionId,
          requiresApproval: false,
        };
      }

      // Normal message flow
      const history = sessionId ? this.genAiRepository.getHistory(sessionId) : undefined;

      if (!history) {
        sessionId = v4();
      }

      const result = await this.genAiRepository.invoke(message, history);

      // Handle approval required scenario (Human-in-the-Loop)
      if (result.type === 'approval_required') {
        this.genAiRepository.setHistory({
          sessionId: sessionId as string,
          messages: [
            { role: 'user', message },
            { role: 'model', message: result.response },
          ],
          pendingInterrupt: result.pendingInterrupt,
        });

        logger.info(
          {
            layer: 'UseCase',
            method: 'execute',
            sessionId,
            isNewSession,
            message: cropText(message),
            response: cropText(result.response),
            requiresApproval: true,
          },
          'Chat execution - approval required (Human-in-the-Loop)',
        );

        return {
          response: result.response,
          sessionId: sessionId as string,
          requiresApproval: true,
          pendingCalculation: result.pendingCalculation,
        };
      }

      // Normal completion
      this.genAiRepository.setHistory({
        sessionId: sessionId as string,
        messages: [
          { role: 'user', message },
          { role: 'model', message: result.response },
        ],
      });

      logger.info(
        {
          layer: 'UseCase',
          method: 'execute',
          sessionId,
          isNewSession,
          message: cropText(message),
          response: cropText(result.response),
        },
        'Chat execution completed',
      );

      return {
        response: result.response,
        sessionId: sessionId as string,
        requiresApproval: false,
      };
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
