import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value.trim();
}

function readPort(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === '') {
    return fallback;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a port from 1 to 65535`);
  }
  return port;
}

function readRounds(): number {
  const raw = process.env.BCRYPT_ROUNDS ?? '12';
  const rounds = Number(raw);
  if (!Number.isInteger(rounds) || rounds < 10 || rounds > 15) {
    throw new Error('BCRYPT_ROUNDS must be an integer from 10 to 15');
  }
  return rounds;
}

const jwtSecret = requireEnv('JWT_SECRET');
if (jwtSecret.length < 16) {
  throw new Error('JWT_SECRET must be at least 16 characters');
}

function readBoundedInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}`);
  }
  return value;
}

function readRagConfig() {
  const chunkChars = readBoundedInt('RAG_CHUNK_CHARS', 1000, 200, 4000);
  const chunkOverlap = readBoundedInt('RAG_CHUNK_OVERLAP', 150, 0, 1000);
  if (chunkOverlap >= chunkChars) throw new Error('RAG_CHUNK_OVERLAP must be smaller than RAG_CHUNK_CHARS');
  return {
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL?.trim() || 'gemini-embedding-001',
    embeddingDimensions: readBoundedInt('GEMINI_EMBEDDING_DIMENSIONS', 768, 128, 3072),
    generationModel: process.env.GEMINI_GENERATION_MODEL?.trim() || 'gemini-2.5-flash',
    topK: readBoundedInt('RAG_TOP_K', 5, 1, 20),
    minSimilarity: readMinSimilarity(),
    maxPdfBytes: readBoundedInt('RAG_MAX_PDF_BYTES', 8 * 1024 * 1024, 1024, 20 * 1024 * 1024),
    maxPdfPages: readBoundedInt('RAG_MAX_PDF_PAGES', 40, 1, 200),
    chunkChars,
    chunkOverlap,
  };
}

function readMinSimilarity(): number {
  const raw = process.env.RAG_MIN_SIMILARITY;
  if (!raw || raw.trim() === '') return 0.55;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error('RAG_MIN_SIMILARITY must be a number from 0 to 1');
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: readPort('PORT', 4000),
  db: {
    host: process.env.DB_HOST?.trim() || '127.0.0.1',
    port: readPort('DB_PORT', 3306),
    name: requireEnv('DB_NAME'),
    user: requireEnv('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
  },
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '8h',
  corsOrigin: process.env.CORS_ORIGIN?.trim() || 'http://localhost:5173',
  bcryptRounds: readRounds(),
  appTimezone: process.env.APP_TIMEZONE?.trim() || 'Asia/Kolkata',
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || '',
  rag: readRagConfig(),
};
