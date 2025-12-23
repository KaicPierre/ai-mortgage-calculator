export interface IGenAiRepository {
  invoke(message: string, session?: ISession): Promise<string>;
  getHistory(sessionId: string): ISession | undefined;
  setHistory(session: ISession): void;
}

export interface IMessages {
  role: 'user' | 'model';
  message: string;
}
export interface ISession {
  sessionId: string;
  messages: IMessages[];
}
