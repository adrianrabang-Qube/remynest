import type { MemoryBook } from "./memory-book";
import type { RemyBiography } from "./biography";

/**
 * Export Engine (V1) — the reusable export layer.
 *
 *   MemoryBook / Biography → ExportDocument → (print engine) PDF
 *
 * A read-only, render-agnostic flattening of a Memory Book or Biography into an
 * ordered list of PDF-ready blocks. It is pure composition: it reuses existing
 * prose verbatim and generates nothing. Any renderer (the print page today; a
 * PDF library later) consumes the same `ExportDocument`. NOT cloud storage, NOT
 * sharing, NOT email.
 */
export type ExportBlockType =
  | "title"
  | "subtitle"
  | "heading"
  | "subheading"
  | "paragraph"
  | "divider"
  | "pagebreak";

export interface ExportBlock {
  type: ExportBlockType;
  text?: string;
}

export interface ExportDocument {
  title: string;
  subtitle: string | null;
  blocks: ExportBlock[];
  meta: {
    generatedAt: string;
    sectionCount: number;
  };
}

function tableOfContentsBlocks(
  entries: { number: number; title: string }[]
): ExportBlock[] {
  if (entries.length === 0) return [];
  const blocks: ExportBlock[] = [
    { type: "heading", text: "Contents" },
  ];
  for (const e of entries) {
    blocks.push({ type: "paragraph", text: `${e.number}.  ${e.title}` });
  }
  return blocks;
}

/** Flatten a Memory Book (cover + TOC + sections/chapters) into an export doc. */
export function buildExportDocumentFromMemoryBook(
  book: MemoryBook
): ExportDocument {
  const blocks: ExportBlock[] = [];

  blocks.push({ type: "title", text: book.cover.title });
  if (book.cover.subtitle) {
    blocks.push({ type: "subtitle", text: book.cover.subtitle });
  }
  blocks.push({ type: "divider" });

  blocks.push(...tableOfContentsBlocks(book.tableOfContents));

  for (const section of book.sections) {
    blocks.push({ type: "pagebreak" });
    blocks.push({ type: "heading", text: section.title });

    if (section.chapters && section.chapters.length > 0) {
      for (const chapter of section.chapters) {
        blocks.push({
          type: "subheading",
          text: `${chapter.number}.  ${chapter.title}`,
        });
        for (const paragraph of chapter.paragraphs) {
          blocks.push({ type: "paragraph", text: paragraph });
        }
      }
    } else {
      for (const paragraph of section.paragraphs) {
        blocks.push({ type: "paragraph", text: paragraph });
      }
    }
  }

  return {
    title: book.title,
    subtitle: book.subtitle,
    blocks,
    meta: {
      generatedAt: new Date().toISOString(),
      sectionCount: book.sections.length,
    },
  };
}

/** Flatten a Biography (no chapter nesting) into an export doc. */
export function buildExportDocumentFromBiography(
  biography: RemyBiography
): ExportDocument {
  const blocks: ExportBlock[] = [];

  blocks.push({ type: "title", text: biography.title });
  if (biography.subtitle) {
    blocks.push({ type: "subtitle", text: biography.subtitle });
  }
  blocks.push({ type: "divider" });

  blocks.push(
    ...tableOfContentsBlocks(
      biography.sections.map((s, i) => ({ number: i + 1, title: s.title }))
    )
  );

  for (const section of biography.sections) {
    blocks.push({ type: "pagebreak" });
    blocks.push({ type: "heading", text: section.title });
    for (const paragraph of section.paragraphs) {
      blocks.push({ type: "paragraph", text: paragraph });
    }
  }

  return {
    title: biography.title,
    subtitle: biography.subtitle,
    blocks,
    meta: {
      generatedAt: new Date().toISOString(),
      sectionCount: biography.sections.length,
    },
  };
}

/** Convenience: prefer the Memory Book, fall back to the Biography. */
export function buildExportDocument(input: {
  memoryBook?: MemoryBook | null;
  biography?: RemyBiography | null;
}): ExportDocument | null {
  if (input.memoryBook) {
    return buildExportDocumentFromMemoryBook(input.memoryBook);
  }
  if (input.biography) {
    return buildExportDocumentFromBiography(input.biography);
  }
  return null;
}
