import pino from 'pino';

export const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:HH:MM:ss',
      ignore: 'pid,hostname',
      singleLine: false,
      levelFirst: true,
      messageFormat: '{msg}'
    }
  },
  level: process.env.LOG_LEVEL || 'info',
  base: undefined, // Remove default fields
});

// Helper function to crop long strings
export const cropText = (text: string, maxLength: number = 50): string => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};
