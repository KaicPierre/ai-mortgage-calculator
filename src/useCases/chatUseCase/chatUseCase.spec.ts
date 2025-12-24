import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { IGenAiRepository, IInvokeResponse, ISession } from '@repositories/interfaces';

import { ChatUseCase } from './chatUseCase';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123'),
}));

// Mock logger
vi.mock('@shared/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  cropText: vi.fn((text: string) => text),
}));

describe('ChatUseCase', () => {
  let chatUseCase: ChatUseCase;
  let mockGenAiRepository: IGenAiRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGenAiRepository = {
      invoke: vi.fn(),
      resumeWithApproval: vi.fn(),
      getHistory: vi.fn(),
      setHistory: vi.fn(),
    };

    chatUseCase = new ChatUseCase(mockGenAiRepository);
  });

  describe('execute', () => {
    describe('approval flow', () => {
      it('should process approval when approved is true', async () => {
        const sessionId = 'existing-session-id';
        const approval = { approved: true };
        const mockResponse: IInvokeResponse = {
          type: 'completed',
          response: 'Mortgage calculation completed successfully.',
        };

        vi.mocked(mockGenAiRepository.resumeWithApproval).mockResolvedValue(mockResponse);

        const result = await chatUseCase.execute('', sessionId, approval);

        expect(mockGenAiRepository.resumeWithApproval).toHaveBeenCalledWith(sessionId, true);
        expect(mockGenAiRepository.setHistory).toHaveBeenCalledWith({
          sessionId,
          messages: [
            { role: 'user', message: 'Yes, proceed with the calculation' },
            { role: 'model', message: mockResponse.response },
          ],
        });
        expect(result).toEqual({
          response: mockResponse.response,
          sessionId,
          requiresApproval: false,
        });
      });

      it('should process approval when approved is false', async () => {
        const sessionId = 'existing-session-id';
        const approval = { approved: false };
        const mockResponse: IInvokeResponse = {
          type: 'completed',
          response: 'Calculation cancelled.',
        };

        vi.mocked(mockGenAiRepository.resumeWithApproval).mockResolvedValue(mockResponse);

        const result = await chatUseCase.execute('', sessionId, approval);

        expect(mockGenAiRepository.resumeWithApproval).toHaveBeenCalledWith(sessionId, false);
        expect(mockGenAiRepository.setHistory).toHaveBeenCalledWith({
          sessionId,
          messages: [
            { role: 'user', message: 'No, cancel the calculation' },
            { role: 'model', message: mockResponse.response },
          ],
        });
        expect(result).toEqual({
          response: mockResponse.response,
          sessionId,
          requiresApproval: false,
        });
      });
    });

    describe('new session flow', () => {
      it('should create a new session when no sessionId is provided', async () => {
        const message = 'Calculate mortgage for $300,000 home';
        const mockResponse: IInvokeResponse = {
          type: 'completed',
          response: 'Here is your mortgage calculation.',
        };

        vi.mocked(mockGenAiRepository.getHistory).mockReturnValue(undefined);
        vi.mocked(mockGenAiRepository.invoke).mockResolvedValue(mockResponse);

        const result = await chatUseCase.execute(message);

        expect(mockGenAiRepository.getHistory).not.toHaveBeenCalled();
        expect(mockGenAiRepository.invoke).toHaveBeenCalledWith(message, undefined);
        expect(mockGenAiRepository.setHistory).toHaveBeenCalledWith({
          sessionId: 'mock-uuid-123',
          messages: [
            { role: 'user', message },
            { role: 'model', message: mockResponse.response },
          ],
        });
        expect(result).toEqual({
          response: mockResponse.response,
          sessionId: 'mock-uuid-123',
          requiresApproval: false,
        });
      });

      it('should create a new session when sessionId is provided but history not found', async () => {
        const message = 'Calculate mortgage';
        const sessionId = 'non-existent-session';
        const mockResponse: IInvokeResponse = {
          type: 'completed',
          response: 'Here is your mortgage calculation.',
        };

        vi.mocked(mockGenAiRepository.getHistory).mockReturnValue(undefined);
        vi.mocked(mockGenAiRepository.invoke).mockResolvedValue(mockResponse);

        const result = await chatUseCase.execute(message, sessionId);

        expect(mockGenAiRepository.getHistory).toHaveBeenCalledWith(sessionId);
        expect(mockGenAiRepository.invoke).toHaveBeenCalledWith(message, undefined);
        expect(result.sessionId).toBe('mock-uuid-123');
      });
    });

    describe('existing session flow', () => {
      it('should use existing session when history is found', async () => {
        const message = 'What about a 15-year term?';
        const sessionId = 'existing-session-id';
        const mockHistory: ISession = {
          sessionId,
          messages: [
            { role: 'user', message: 'Calculate mortgage' },
            { role: 'model', message: 'Here is the calculation' },
          ],
        };
        const mockResponse: IInvokeResponse = {
          type: 'completed',
          response: 'Here is the 15-year term calculation.',
        };

        vi.mocked(mockGenAiRepository.getHistory).mockReturnValue(mockHistory);
        vi.mocked(mockGenAiRepository.invoke).mockResolvedValue(mockResponse);

        const result = await chatUseCase.execute(message, sessionId);

        expect(mockGenAiRepository.getHistory).toHaveBeenCalledWith(sessionId);
        expect(mockGenAiRepository.invoke).toHaveBeenCalledWith(message, mockHistory);
        expect(mockGenAiRepository.setHistory).toHaveBeenCalledWith({
          sessionId,
          messages: [
            { role: 'user', message },
            { role: 'model', message: mockResponse.response },
          ],
        });
        expect(result).toEqual({
          response: mockResponse.response,
          sessionId,
          requiresApproval: false,
        });
      });
    });

    describe('approval required flow (Human-in-the-Loop)', () => {
      it('should return requiresApproval true when tool needs approval', async () => {
        const message = 'Calculate mortgage for $500,000';
        const mockPendingInterrupt = {
          interrupt: { toolRequest: { name: 'mortgageCalculator' } },
          toolInput: { homePrice: 500000, downPayment: 100000 },
          previousResponse: {},
        };
        const mockResponse: IInvokeResponse = {
          type: 'approval_required',
          response: 'Do you approve this calculation?',
          pendingCalculation: { homePrice: 500000, downPayment: 100000 },
          pendingInterrupt: mockPendingInterrupt,
        };

        vi.mocked(mockGenAiRepository.getHistory).mockReturnValue(undefined);
        vi.mocked(mockGenAiRepository.invoke).mockResolvedValue(mockResponse);

        const result = await chatUseCase.execute(message);

        expect(mockGenAiRepository.setHistory).toHaveBeenCalledWith({
          sessionId: 'mock-uuid-123',
          messages: [
            { role: 'user', message },
            { role: 'model', message: mockResponse.response },
          ],
          pendingInterrupt: mockPendingInterrupt,
        });
        expect(result).toEqual({
          response: mockResponse.response,
          sessionId: 'mock-uuid-123',
          requiresApproval: true,
          pendingCalculation: mockResponse.pendingCalculation,
        });
      });

      it('should handle approval required with existing session', async () => {
        const message = 'Calculate a new mortgage';
        const sessionId = 'existing-session-id';
        const mockHistory: ISession = {
          sessionId,
          messages: [{ role: 'user', message: 'Hi' }],
        };
        const mockPendingInterrupt = {
          interrupt: {},
          toolInput: { homePrice: 300000 },
          previousResponse: {},
        };
        const mockResponse: IInvokeResponse = {
          type: 'approval_required',
          response: 'Approve this?',
          pendingCalculation: { homePrice: 300000 },
          pendingInterrupt: mockPendingInterrupt,
        };

        vi.mocked(mockGenAiRepository.getHistory).mockReturnValue(mockHistory);
        vi.mocked(mockGenAiRepository.invoke).mockResolvedValue(mockResponse);

        const result = await chatUseCase.execute(message, sessionId);

        expect(result.sessionId).toBe(sessionId);
        expect(result.requiresApproval).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should throw error and log when invoke fails', async () => {
        const message = 'Calculate mortgage';
        const error = new Error('AI service unavailable');

        vi.mocked(mockGenAiRepository.getHistory).mockReturnValue(undefined);
        vi.mocked(mockGenAiRepository.invoke).mockRejectedValue(error);

        await expect(chatUseCase.execute(message)).rejects.toThrow('AI service unavailable');
      });

      it('should throw error when resumeWithApproval fails', async () => {
        const sessionId = 'session-id';
        const approval = { approved: true };
        const error = new Error('Resume failed');

        vi.mocked(mockGenAiRepository.resumeWithApproval).mockRejectedValue(error);

        await expect(chatUseCase.execute('', sessionId, approval)).rejects.toThrow('Resume failed');
      });

      it('should handle non-Error objects in catch block', async () => {
        const message = 'Calculate mortgage';

        vi.mocked(mockGenAiRepository.getHistory).mockReturnValue(undefined);
        vi.mocked(mockGenAiRepository.invoke).mockRejectedValue('String error');

        await expect(chatUseCase.execute(message)).rejects.toBe('String error');
      });

      it('should log error with sessionId as "none" when sessionId is undefined', async () => {
        const message = 'Calculate mortgage';
        const error = new Error('Failed');

        vi.mocked(mockGenAiRepository.getHistory).mockReturnValue(undefined);
        vi.mocked(mockGenAiRepository.invoke).mockRejectedValue(error);

        await expect(chatUseCase.execute(message)).rejects.toThrow();
      });

      it('should log error with sessionId when sessionId is provided', async () => {
        const message = 'Calculate mortgage';
        const sessionId = 'existing-session-id';
        const error = new Error('Failed with session');
        const mockHistory: ISession = {
          sessionId,
          messages: [],
        };

        vi.mocked(mockGenAiRepository.getHistory).mockReturnValue(mockHistory);
        vi.mocked(mockGenAiRepository.invoke).mockRejectedValue(error);

        await expect(chatUseCase.execute(message, sessionId)).rejects.toThrow('Failed with session');
      });
    });
  });
});
