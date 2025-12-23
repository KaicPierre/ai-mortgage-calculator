export interface IGenAiRepository {
  invoke(message: string, sessionId?: string): Promise<any>;
}