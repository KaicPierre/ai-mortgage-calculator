import { ai } from '@shared/ai-instance';
import { AIGenerationError, RepositoryError } from '@shared/errors';
import { logger, cropText } from '@shared/logger';

import type { IGenAiRepository, IInvokeResponse, ISession } from './interfaces';
import { mortgageCalculator } from './tools/mortgageCalculator.tool';

export class GenAiRepository implements IGenAiRepository {
  private session: ISession[] = [];

  async invoke(message: string, session?: ISession): Promise<IInvokeResponse> {
    const sessionId = session?.sessionId || 'new';

    try {
      logger.info(
        {
          layer: 'Repository',
          method: 'invoke',
          sessionId,
          message: cropText(message),
        },
        'Generating AI response',
      );

      const prompt = `
          You are a friendly and knowledgeable mortgage assistant helping users explore their home financing options through our web chatbot. Your role is to guide them through mortgage simulations and make the process engaging and informative.

          CONVERSATION STYLE:
          - Be warm, conversational, and encouraging - speak like a helpful friend, not a formal banker
          - Use natural language with appropriate enthusiasm when discussing their options
          - Break down complex mortgage concepts into simple, relatable terms
          - Show genuine interest in helping them find the best mortgage solution

          YOUR MAIN GOALS:
          - Help users run mortgage simulations and understand their results
          - Encourage users to explore different scenarios by adjusting variables like down payment, loan term, interest rate, or home price
          - After showing simulation results, proactively suggest "What if?" scenarios they might want to explore
          - Explain the impact of changing different parameters in an easy-to-understand way
          - Guide them through the U.S. mortgage process when they have questions

          OUTPUT FORMATTING RULES (CRITICAL):
          - NEVER use markdown formatting (no #, **, *, -, etc.)
          - Write in plain text only
          - Use line breaks (double newlines) to separate paragraphs and make the text more readable
          - Use simple punctuation and clear sentence structure
          - Keep paragraphs short (2-3 sentences) for better readability on screen

          ENCOURAGING EXPLORATION:
          After providing simulation results, always suggest exploring variations like:
          - "What if you increased your down payment to 20% to avoid PMI?"
          - "Would you like to see how a 15-year loan compares to a 30-year loan?"
          - "Curious how a slightly different interest rate would affect your monthly payment?"
          - "Want to explore what happens if you adjust the home price range?"

          CONTEXT FROM PREVIOUS CONVERSATION:
          ${JSON.stringify(session?.messages || [])}

          USER'S CURRENT MESSAGE:
          ${message}

          Remember: Keep your response conversational, helpful, and formatted as plain text with line breaks for readability. No markdown formatting.
        `;

      const response = await ai.generate({
        prompt,
        tools: [mortgageCalculator],
      });

      // Check if there are interrupts (Human-in-the-Loop)
      if (response.interrupts && response.interrupts.length > 0) {
        const interrupt = response.interrupts[0];
        const toolInput = interrupt.toolRequest.input as Record<string, unknown>;

        logger.info(
          {
            layer: 'Repository',
            method: 'invoke',
            sessionId,
            toolName: interrupt.toolRequest.name,
            toolInput,
          },
          'Tool execution requires approval - Human-in-the-Loop triggered',
        );

        // Store the interrupt and full response for later resumption

        console.log("SAVED RESPONSE: ", JSON.stringify(response))
        if (session) {
          session.pendingInterrupt = {
            interrupt,
            toolInput,
            previousResponse: response,
          };
        }

        // Get the approval message from the interrupt metadata
        const approvalMessage =
          (interrupt.metadata?.message as string) ||
          `The mortgage calculation requires your approval. Do you want to proceed?`;

        // Create the pendingInterrupt object to return
        const pendingInterrupt = {
          interrupt,
          toolInput,
          previousResponse: response,
        };

        return {
          type: 'approval_required',
          response: approvalMessage,
          pendingCalculation: toolInput,
          pendingInterrupt,
        };
      }

      // No interrupts - return the normal response
      if (!response?.message?.content?.[0]?.text) {
        throw new AIGenerationError('No response generated from AI');
      }

      const result = response.message.content[0].text;

      logger.info(
        {
          layer: 'Repository',
          method: 'invoke',
          sessionId,
          response: cropText(result),
        },
        'AI response generated successfully',
      );

      return {
        type: 'completed',
        response: result,
      };
    } catch (error) {
      logger.error(
        {
          layer: 'Repository',
          method: 'invoke',
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to generate AI response',
      );

      if (error instanceof AIGenerationError || error instanceof RepositoryError) {
        throw error;
      }
      throw new RepositoryError(
        `Failed to generate AI response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  //! Ai Generated logic
  async resumeWithApproval(sessionId: string, approved: boolean): Promise<IInvokeResponse> {
    try {
      const session = this.getHistory(sessionId);

      if (!session?.pendingInterrupt) {
        throw new RepositoryError('No pending approval found for this session', 400);
      }

      const { interrupt, previousResponse } = session.pendingInterrupt;

      logger.info(
        {
          layer: 'Repository',
          method: 'resumeWithApproval',
          sessionId,
          approved,
        },
        'Resuming with user approval decision',
      );

      // Type the previous response correctly
      const typedPreviousResponse = previousResponse as Awaited<ReturnType<typeof ai.generate>>;

      // Create the restart with approval/rejection status
      const restart = mortgageCalculator.restart(
        interrupt as Parameters<typeof mortgageCalculator.restart>[0],
        { status: approved ? 'APPROVED' : 'REJECTED' },
      );

      const resumedResponse = await ai.generate({
        tools: [mortgageCalculator],
        messages: typedPreviousResponse.messages,
        resume: {
          restart: [restart],
        },
      } as any);

      // Clear the pending interrupt
      delete session.pendingInterrupt;

      if (!resumedResponse?.text) {
        throw new AIGenerationError('No response generated from AI after approval');
      }

      const result = resumedResponse.text;

      logger.info(
        {
          layer: 'Repository',
          method: 'resumeWithApproval',
          sessionId,
          response: cropText(result),
        },
        'Resumed generation completed',
      );

      return {
        type: 'completed',
        response: result,
      };
    } catch (error) {
      logger.error(
        {
          layer: 'Repository',
          method: 'resumeWithApproval',
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to resume with approval',
      );

      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new RepositoryError(
        `Failed to resume with approval: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  getHistory(sessionId: string): ISession | undefined {
    try {
      if (!sessionId || sessionId.trim().length === 0) {
        throw new RepositoryError('Session ID cannot be empty', 400);
      }

      const history = this.session.find((s) => s.sessionId === sessionId);

      logger.info(
        {
          layer: 'Repository',
          method: 'getHistory',
          sessionId,
          found: !!history,
          messagesCount: history?.messages.length || 0,
        },
        'Session history retrieved',
      );

      return history;
    } catch (error) {
      logger.error(
        {
          layer: 'Repository',
          method: 'getHistory',
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to retrieve session history',
      );
      throw error;
    }
  }

  setHistory(newSession: ISession): void {
    try {
      const index = this.session.findIndex((s) => s.sessionId === newSession.sessionId);
      const action = index === -1 ? 'created' : 'updated';

      if (index === -1) {
        this.session.push(newSession);
      } else {
        this.session[index].messages.push(...newSession.messages);
        // Preserve pending interrupt if provided
        if (newSession.pendingInterrupt !== undefined) {
          this.session[index].pendingInterrupt = newSession.pendingInterrupt;
        }
      }

      logger.info(
        {
          layer: 'Repository',
          method: 'setHistory',
          sessionId: newSession.sessionId,
          action,
          messagesCount: newSession.messages.length,
          totalMessages: index === -1 ? newSession.messages.length : this.session[index].messages.length,
          hasPendingInterrupt: !!newSession.pendingInterrupt,
        },
        `Session ${action} successfully`,
      );
    } catch (error) {
      logger.error(
        {
          layer: 'Repository',
          method: 'setHistory',
          sessionId: newSession.sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to set session history',
      );
      throw error;
    }
  }
}