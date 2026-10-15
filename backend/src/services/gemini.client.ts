import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

export type EmbeddingTask = 'RETRIEVAL_DOCUMENT' | 'QUESTION_ANSWERING';

export type GeminiClient = {
  embed(texts: string[], task: EmbeddingTask): Promise<number[][]>;
  generate(systemInstruction: string, prompt: string): Promise<string>;
};

let override: GeminiClient | null = null;

export function setGeminiClient(next: GeminiClient | null): void {
  override = next;
}

export function getGeminiClient(): GeminiClient {
  return override ?? googleClient;
}

const googleClient: GeminiClient = {
  async embed(texts, task) {
    const ai = client();
    const response = await withRetry(() =>
      ai.models.embedContent({
        model: env.rag.embeddingModel,
        contents: texts,
        config: {
          taskType: task,
          outputDimensionality: env.rag.embeddingDimensions,
        },
      }),
    );
    const embeddings = response.embeddings ?? [];
    return embeddings.map((item) => item.values ?? []);
  },
  async generate(systemInstruction, prompt) {
    const ai = client();
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: env.rag.generationModel,
        contents: prompt,
        config: { systemInstruction },
      }),
    );
    return response.text?.trim() ?? '';
  },
};

function client(): GoogleGenAI {
  if (!env.geminiApiKey) {
    throw new AppError(503, 'UNAVAILABLE', 'The assistant is not configured.');
  }
  return new GoogleGenAI({ apiKey: env.geminiApiKey });
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryable(error) || attempt === maxAttempts - 1) {
        throw error;
      }
      await delay(1000 * 2 ** attempt);
    }
  }
  throw new Error('Gemini request retry loop ended unexpectedly.');
}

function isRetryable(error: unknown): boolean {
  const status = statusCode(error);
  if (status !== null) {
    return status === 408 || status === 429 || status >= 500;
  }
  const message = error instanceof Error ? error.message : '';
  return message.includes('429') || message.toLowerCase().includes('resource exhausted');
}

function statusCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null;
  const value = error as { status?: unknown; statusCode?: unknown };
  const status = Number(value.status ?? value.statusCode);
  return Number.isInteger(status) ? status : null;
}

export function geminiFailureKind(error: unknown): 'rate-limit' | 'configuration' | 'unavailable' {
  const status = statusCode(error);
  if (status === 429 || (error instanceof Error && error.message.toLowerCase().includes('resource exhausted'))) {
    return 'rate-limit';
  }
  if (status === 401 || status === 403) {
    return 'configuration';
  }
  return 'unavailable';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
