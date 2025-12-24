import { genkit } from 'genkit/beta';

import { googleAI } from '@genkit-ai/google-genai';
import { env } from '@env/index';

// Shared AI instance for the entire application
export const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model(env.GEMINI_MODEL),
});
