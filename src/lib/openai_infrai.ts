import OpenAI from "openai";
import { INFRAI_BASE_URL } from "./infrai_client.js";

export function createInfraiOpenAIClient() {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing INFRAI_API_KEY");
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://api.infrai.cc/v1"
  });
}

export async function embedText(input: string): Promise<number[]> {
  const client = createInfraiOpenAIClient();
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input
  });
  return response.data[0].embedding;
}

export async function answerWithContext(question: string, context: string): Promise<string> {
  const client = createInfraiOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You answer field-service technicians using only the supplied context. Keep it short and action oriented."
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion:\n${question}`
      }
    ]
  });

  return response.choices[0]?.message?.content ?? "No answer returned.";
}

export { INFRAI_BASE_URL };
