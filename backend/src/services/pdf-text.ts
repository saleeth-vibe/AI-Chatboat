import { extractText } from 'unpdf';

export type PdfPage = {
  pageNumber: number;
  text: string;
};

type PdfExtractor = (bytes: Buffer) => Promise<PdfPage[]>;

let extractor: PdfExtractor = extractPdfPages;

export function setPdfExtractor(next: PdfExtractor | null): void {
  extractor = next ?? extractPdfPages;
}

export function readPdfPages(bytes: Buffer): Promise<PdfPage[]> {
  return extractor(bytes);
}

async function extractPdfPages(bytes: Buffer): Promise<PdfPage[]> {
  const result = await extractText(new Uint8Array(bytes), { mergePages: false });
  const pages = Array.isArray(result.text) ? result.text : [result.text];
  return pages.map((text, index) => ({ pageNumber: index + 1, text: text ?? '' }));
}
