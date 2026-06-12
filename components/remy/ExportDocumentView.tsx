import type {
  ExportBlock,
  ExportDocument,
} from "@/lib/remy/export-document";

/**
 * Renders an ExportDocument as a clean, print-ready document. Pure presentation;
 * the print stylesheet (globals.css #remy-export) isolates this for PDF output.
 */
export default function ExportDocumentView({
  document,
}: {
  document: ExportDocument;
}) {
  return (
    <div className="mx-auto max-w-2xl font-serif text-charcoal">
      {document.blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: ExportBlock }) {
  switch (block.type) {
    case "title":
      return (
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          {block.text}
        </h1>
      );
    case "subtitle":
      return (
        <p className="mt-1 text-sm font-medium uppercase tracking-[0.2em] text-charcoal-muted">
          {block.text}
        </p>
      );
    case "heading":
      return (
        <h2 className="mt-8 text-2xl font-semibold">{block.text}</h2>
      );
    case "subheading":
      return (
        <h3 className="mt-5 text-lg font-semibold">{block.text}</h3>
      );
    case "paragraph":
      return (
        <p className="mt-3 text-[17px] leading-relaxed text-charcoal-soft break-words">
          {block.text}
        </p>
      );
    case "divider":
      return <hr className="mt-6 border-sand-deep/60" />;
    case "pagebreak":
      return <div className="break-page" aria-hidden="true" />;
    default:
      return null;
  }
}
