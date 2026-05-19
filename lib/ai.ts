import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { deepseek } from '@ai-sdk/deepseek';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

export function getModel(modelName: string) {
  if (modelName.startsWith('gpt-')) {
    return openai(modelName);
  }
  if (modelName.startsWith('gemini-')) {
    return google(modelName);
  }
  if (modelName.startsWith('deepseek-')) {
    return deepseek(modelName);
  }
  return groq(modelName || 'llama-3.3-70b-versatile');
}
