import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

// Create the Google Gen AI client
// Create the Google Gen AI client - Prevent crash if key is missing (e.g. in browser)
if (!apiKey && typeof window !== 'undefined') {
  console.warn('GEMINI_API_KEY is missing in client environment. AI flows should only run on server.');
}

export const ai = new GoogleGenAI({ apiKey: apiKey || 'missing-key' });

export const modelName = 'gemini-2.5-flash';
