import { z } from 'genkit';

import 'dotenv/config';

const envSchema = z.object({
  APP_PORT: z.coerce.number().default(3000),
  GEMINI_API_KEY: z.string(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  const message = `Missing or invalid ENVIRONMENT variables - ${JSON.stringify(_env.error.format())}`;
  throw new Error(message);
}

export const env = _env.data;
