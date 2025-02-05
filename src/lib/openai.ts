import OpenAi from 'openai';

export const openai = new OpenAi({
  baseURL: 'https://openrouter.ai/api/v1',   // OpenRouter API base URL
  apiKey: process.env.OPENROUTER_API_KEY,    // Use the OpenRouter API Key
  defaultHeaders: {
    'HTTP-Referer': process.env.SITE_URL,    // Optional, site URL
    'X-Title': process.env.SITE_NAME,        // Optional, site name
  },
});
