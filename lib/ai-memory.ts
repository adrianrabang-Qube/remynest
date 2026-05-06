import { openai } from "@/lib/openai";

export async function generateMemoryInsights(content: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",

    messages: [
      {
        role: "system",
        content:
          "You are an AI memory assistant. Analyze memories and return structured JSON.",
      },
      {
        role: "user",
        content: `
Analyze this memory:

${content}

Return JSON:
{
  "title": "",
  "summary": "",
  "tags": [],
  "category": ""
}
`,
      },
    ],

    response_format: {
      type: "json_object",
    },
  });

  const result = completion.choices[0].message.content;

  if (!result) {
    throw new Error("No AI response");
  }

  return JSON.parse(result);
}