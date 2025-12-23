import type { IGenAiRepository, ISession } from "./interfaces";
import { ai } from "@shared/ai-instance";
import { mortgageCalculator } from './tools/mortgageCalculator.tool'
import { AIGenerationError, RepositoryError } from "@shared/errors";
import { logger, cropText } from "@shared/logger";

export class GenAiRepository implements IGenAiRepository {

  private session: ISession[] = []

  async invoke(message: string, session?: ISession): Promise<any> {
    const sessionId = session?.sessionId || 'new';
    
    try {
      logger.info({ 
        layer: 'Repository',
        method: 'invoke',
        sessionId, 
        message: cropText(message) 
      }, 'Generating AI response');
      
      const response = await ai.generate({
         prompt: `
         You are a mortgage assistant that help users in a web chatbot to get their mortgage simulations done and explain everything about the mortgage process in the U.S.
         
         Here is the conversation so far: ${JSON.stringify(session?.messages)}

         Here is the last user input: ${message}
         `,
         tools: [mortgageCalculator],
      });

      if (!response?.message?.content?.[0]?.text) {
        throw new AIGenerationError('No response generated from AI');
      }

      const result = response.message.content[0].text;
      
      logger.info({ 
        layer: 'Repository',
        method: 'invoke',
        sessionId, 
        response: cropText(result) 
      }, 'AI response generated successfully');
      
      return result;
    } catch (error) {
      logger.error({ 
        layer: 'Repository',
        method: 'invoke',
        sessionId, 
        error: error instanceof Error ? error.message : String(error) 
      }, 'Failed to generate AI response');
      
      if (error instanceof AIGenerationError || error instanceof RepositoryError) {
        throw error;
      }
      throw new RepositoryError(
        `Failed to generate AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

   getHistory(sessionId: string): ISession | undefined{
    try {
      if (!sessionId || sessionId.trim().length === 0) {
        throw new RepositoryError('Session ID cannot be empty', 400);
      }

      const history = this.session.find(s => s.sessionId === sessionId)
      
      logger.info({ 
        layer: 'Repository',
        method: 'getHistory',
        sessionId, 
        found: !!history, 
        messagesCount: history?.messages.length || 0 
      }, 'Session history retrieved');
      
      return history
    } catch (error) {
      logger.error({ 
        layer: 'Repository',
        method: 'getHistory',
        sessionId, 
        error: error instanceof Error ? error.message : String(error) 
      }, 'Failed to retrieve session history');
      throw error;
    }
  }

  setHistory(newSession: ISession): void{
    try {
      const index = this.session.findIndex(s => s.sessionId === newSession.sessionId)
      const action = index === -1 ? 'created' : 'updated';
      
      if(index === -1){ 
        this.session.push(newSession)
      } else {
        this.session[index].messages.push(...newSession.messages)
      }
      
      logger.info({ 
        layer: 'Repository',
        method: 'setHistory',
        sessionId: newSession.sessionId, 
        action,
        messagesCount: newSession.messages.length,
        totalMessages: index === -1 ? newSession.messages.length : this.session[index].messages.length
      }, `Session ${action} successfully`);
    } catch (error) {
      logger.error({ 
        layer: 'Repository',
        method: 'setHistory',
        sessionId: newSession.sessionId, 
        error: error instanceof Error ? error.message : String(error) 
      }, 'Failed to set session history');
      throw error;
    }
  }
}