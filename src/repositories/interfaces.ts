export interface IGenAiRepository {
  invoke(message: string, session?: ISession): Promise<IInvokeResponse>;
  resumeWithApproval(sessionId: string, approved: boolean): Promise<IInvokeResponse>;
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
  pendingInterrupt?: IPendingInterrupt;
}

export interface IPendingInterrupt {
  interrupt: unknown;
  toolInput: Record<string, unknown>;
  previousResponse: unknown; // Store the full response for resumption
}

export interface IInvokeResponse {
  type: 'completed' | 'approval_required';
  response: string;
  pendingCalculation?: Record<string, unknown>;
  pendingInterrupt?: IPendingInterrupt;
}
