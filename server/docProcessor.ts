import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { prisma } from "./db.js";
import { generateEmbedding } from "./ai/embeddings.js";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ProcessedDocumentResult {
  rawText: string;
  pageCount: number;
  pages: ExtractedPage[];
  chunks: Array<{
    pageNumber: number;
    chunkIndex: number;
    content: string;
    embedding: string;
  }>;
}

/**
 * Extracts page-by-page text from a PDF, DOCX, or TXT buffer
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  fileType: string
): Promise<{ rawText: string; pageCount: number; pages: ExtractedPage[] }> {
  const pages: ExtractedPage[] = [];
  let fullText = "";

  if (fileType === "pdf") {
    try {
      const parser: any = new PDFParse({ data: buffer });
      if (typeof parser.load === "function") {
        await parser.load();
      }
      const info: any = typeof parser.getInfo === "function" ? await parser.getInfo() : null;
      const pageCount = Math.max(1, info?.pages?.total || info?.numPages || 1);

      for (let p = 1; p <= pageCount; p++) {
        try {
          if (typeof parser.getPageText === "function") {
            const pageRes: any = await parser.getPageText(p);
            const pageText = (pageRes?.text || "").trim();
            if (pageText) {
              pages.push({ pageNumber: p, text: pageText });
              fullText += `\n--- [Page ${p}] ---\n` + pageText;
            }
          }
        } catch {
          // Continue to next page if one fails
        }
      }

      // If page-by-page loop returned empty, fallback to full text
      if (pages.length === 0) {
        const wholeDoc = await parser.getText();
        const wholeText = (wholeDoc?.text || "").trim();
        if (wholeText) {
          pages.push({ pageNumber: 1, text: wholeText });
          fullText = wholeText;
        }
      }
      await parser.destroy();
    } catch (pdfErr) {
      console.warn("PDF extraction error, trying fallback parser:", pdfErr);
      const str = buffer.toString("utf-8");
      pages.push({ pageNumber: 1, text: str.replace(/[^\x20-\x7E\n\r\t]/g, " ") });
      fullText = pages[0].text;
    }
  } else if (fileType === "docx") {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const docText = result.value.trim();
      fullText = docText;

      // Estimate ~2000 chars per page
      const charChunk = 2000;
      let pageNum = 1;
      for (let i = 0; i < docText.length; i += charChunk) {
        const slice = docText.slice(i, i + charChunk).trim();
        if (slice) {
          pages.push({ pageNumber: pageNum, text: slice });
          pageNum++;
        }
      }
      if (pages.length === 0) {
        pages.push({ pageNumber: 1, text: docText });
      }
    } catch (docxErr) {
      console.warn("DOCX extraction error:", docxErr);
      fullText = "DOCX extraction placeholder text.";
      pages.push({ pageNumber: 1, text: fullText });
    }
  } else {
    // Plain text (TXT) or markdown
    const text = buffer.toString("utf-8").trim();
    fullText = text;
    const charChunk = 2000;
    let pageNum = 1;
    for (let i = 0; i < text.length; i += charChunk) {
      const slice = text.slice(i, i + charChunk).trim();
      if (slice) {
        pages.push({ pageNumber: pageNum, text: slice });
        pageNum++;
      }
    }
    if (pages.length === 0) {
      pages.push({ pageNumber: 1, text: text });
    }
  }

  const cleanFullText = fullText.trim();
  return {
    rawText: cleanFullText,
    pageCount: Math.max(1, pages.length),
    pages,
  };
}

/**
 * Splits extracted pages into semantic chunks and creates embedding vectors
 */
export async function chunkAndEmbedDocument(
  documentId: string,
  pages: ExtractedPage[]
): Promise<void> {
  const chunkSize = 700; // characters per chunk
  const overlap = 100;

  let chunkIndex = 0;

  for (const page of pages) {
    const text = page.text.replace(/\s+/g, " ").trim();
    if (!text) continue;

    if (text.length <= chunkSize) {
      const vec = await generateEmbedding(text);
      await prisma.documentChunk.create({
        data: {
          documentId,
          chunkIndex: chunkIndex++,
          pageNumber: page.pageNumber,
          content: text,
          embedding: JSON.stringify(vec),
        },
      });
    } else {
      let start = 0;
      while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        const chunkText = text.slice(start, end).trim();

        if (chunkText.length > 40) {
          const vec = await generateEmbedding(chunkText);
          await prisma.documentChunk.create({
            data: {
              documentId,
              chunkIndex: chunkIndex++,
              pageNumber: page.pageNumber,
              content: chunkText,
              embedding: JSON.stringify(vec),
            },
          });
        }

        start += chunkSize - overlap;
      }
    }
  }
}
