// src/lib/openrouter.ts
import OpenAI from 'openai';

const openRouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
});

export { openRouter };