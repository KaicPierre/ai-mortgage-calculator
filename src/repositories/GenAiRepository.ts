import type { IGenAiRepository, ISession } from "./interfaces";
import { ai } from "@shared/ai-instance";
import { mortgageCalculator } from './tools/mortgageCalculator.tool'
import { AIGenerationError, RepositoryError } from "@shared/errors";

export class GenAiRepository implements IGenAiRepository {

  private session: ISession[] = []

  async invoke(message: string, session?: ISession): Promise<any> {
    try {
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

      return response.message.content[0].text;
    } catch (error) {
      if (error instanceof AIGenerationError || error instanceof RepositoryError) {
        throw error;
      }
      throw new RepositoryError(
        `Failed to generate AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

   getHistory(sessionId: string): ISession | undefined{
    if (!sessionId || sessionId.trim().length === 0) {
      throw new RepositoryError('Session ID cannot be empty', 400);
    }

    const history = this.session.find(s => s.sessionId === sessionId)
    return history
  }

  setHistory(newSession: ISession): void{
      const index = this.session.findIndex(s => s.sessionId === newSession.sessionId)
      if(index === -1){ 
        this.session.push(newSession)
        return
      }
      this.session[index].messages.push(...newSession.messages)
      return
    }
}