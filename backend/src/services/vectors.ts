export function l2Normalize(values: number[]): number[] {
  let sum = 0;
  for (const value of values) {
    sum += value * value;
  }
  const norm = Math.sqrt(sum);
  if (norm === 0) {
    return values.map(() => 0);
  }
  return values.map((value) => value / norm);
}

export function cosineSimilarity(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  const denom = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
  return denom === 0 ? 0 : dot / denom;
}

export function parseEmbedding(value: unknown, dimensions: number): number[] | null {
  const parsed = typeof value === 'string' ? safeJson(value) : value;
  if (!Array.isArray(parsed) || parsed.length !== dimensions) {
    return null;
  }
  const numbers = parsed.map((item) => (typeof item === 'number' ? item : Number(item)));
  if (numbers.some((item) => !Number.isFinite(item))) {
    return null;
  }
  return numbers;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
