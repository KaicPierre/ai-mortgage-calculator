import type { IGenAiRepository } from "./interfaces";
import { ai } from "@shared/ai-instance";
import { mortgageCalculator } from './tools/mortgageCalculator.tool'

export class GenAiRepository implements IGenAiRepository {

  async invoke(message: string, sessionId?: string): Promise<any> {
    const response = await ai.generate({
       prompt: `
       You are a mortgage assistant that help users in a web chatbot to get their mortgage simulations done and explain everything about the mortgage process in the U.S. 
       
       Here is the user input: ${message}
       `,
       tools: [mortgageCalculator],
    })

    return response.message?.content[0].text
  }
}