import { openai } from "@/lib/openai";

export async function generateEmbedding(text: string) {
  console.log("🚀 GENERATING EMBEDDING");

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  console.log("✅ EMBEDDING RESPONSE RECEIVED");

  return response.data[0].embedding;
}