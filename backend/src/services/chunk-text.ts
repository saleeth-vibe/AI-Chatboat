export type TextChunk = {
  content: string;
  pageNumber: number;
};

export function chunkPages(
  pages: Array<{ pageNumber: number; text: string }>,
  size: number,
  overlap: number,
): TextChunk[] {
  const chunks: TextChunk[] = [];
  const step = Math.max(1, size - overlap);
  for (const page of pages) {
    const text = page.text.replace(/\s+/g, ' ').trim();
    if (!text) {
      continue;
    }
    if (text.length <= size) {
      chunks.push({ content: text, pageNumber: page.pageNumber });
      continue;
    }
    for (let start = 0; start < text.length; start += step) {
      const content = text.slice(start, start + size).trim();
      if (content) {
        chunks.push({ content, pageNumber: page.pageNumber });
      }
      if (start + size >= text.length) {
        break;
      }
    }
  }
  return chunks;
}
