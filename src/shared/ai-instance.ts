import { genkit } from "genkit/beta";
import { googleAI } from "@genkit-ai/google-genai";

// Shared AI instance for the entire application
export const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'),
});
