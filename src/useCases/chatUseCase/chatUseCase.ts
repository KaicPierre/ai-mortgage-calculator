import type { IGenAiRepository } from "@repositories/interfaces";
import { inject, injectable } from "tsyringe";

@injectable()
export class ChatUseCase {
  constructor(
    @inject('GenAiRepository')
    private genAiRepository: IGenAiRepository
  ){}

  async execute(message: string, sessionId?: string) {
   const response = this.genAiRepository.invoke(message, sessionId)
   return response
  }
}