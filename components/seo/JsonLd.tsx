/**
 * Renders a JSON-LD structured-data block. Server component (no client JS).
 * `data` may be a single schema.org object or an array of them.
 */
export default function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline as application/ld+json.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
