import type { IGenAiRepository } from "@repositories/interfaces";
import { inject, injectable } from "tsyringe";
import { v4 } from "uuid";

@injectable()
export class ChatUseCase {
  constructor(
    @inject('GenAiRepository')
    private genAiRepository: IGenAiRepository
  ){}

  async execute(message: string, sessionId?: string) { 
    try {
      const history = sessionId ? this.genAiRepository.getHistory(sessionId) : undefined
      console.log(history)
      if(!history){ 
        sessionId = v4()
        const response = await this.genAiRepository.invoke(message)
        this.genAiRepository.setHistory({sessionId, messages: [{role: "user", message }, {role: "model", message: response}]})
        return {response, sessionId}
      }

      const response = await this.genAiRepository.invoke(message, history)
      this.genAiRepository.setHistory({sessionId: sessionId as string, messages: [{role: "user", message }, {role: "model", message: response}]})

      return {response, sessionId}
    } catch (error) {
      throw error;
    }
    
} 
}