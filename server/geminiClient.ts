import { GoogleGenAI } from "@google/genai";

const apiKey =
  process.env.AI_INTEGRATIONS_GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  "";

const baseUrl =
  process.env.AI_INTEGRATIONS_GEMINI_BASE_URL ||
  process.env.GEMINI_BASE_URL ||
  undefined;

if (!apiKey) {
  console.warn("[gemini] No Gemini API key found - AI Copilot and UGC will fail");
}

export const GEMINI_CONFIGURED = !!apiKey;

export const ai = new GoogleGenAI({
  apiKey,
  ...(baseUrl ? { httpOptions: { baseUrl } } : {}),
});
