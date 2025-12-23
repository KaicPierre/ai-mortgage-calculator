export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class RepositoryError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode, true);
  }
}

export class SessionNotFoundError extends AppError {
  constructor(sessionId: string) {
    super(`Session with ID ${sessionId} not found`, 404, true);
  }
}

export class AIGenerationError extends AppError {
  constructor(message: string) {
    super(`AI generation failed: ${message}`, 500, true);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, true);
  }
}
