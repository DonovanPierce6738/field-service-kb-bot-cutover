import { z } from "zod";
import { decideFollowup } from "./domain/dispatch_followup_policy.js";
import { infrai } from "./lib/infrai_client.js";
import { answerWithContext, embedText } from "./lib/openai_infrai.js";

export const FieldServiceFollowupRequestSchema = z.object({
  workOrderId: z.string().min(1),
  dispatchStatus: z.enum(["scheduled", "dispatched", "en_route", "on_site", "completed", "cancelled"]),
  photoLabels: z.array(z.string().min(1)).min(1),
  serviceNote: z.string().min(1),
  technicianQuestion: z.string().min(1)
});

export type FieldServiceFollowupRequest = z.infer<typeof FieldServiceFollowupRequestSchema>;

export async function handleFieldServiceFollowup(input: unknown) {
  const body = FieldServiceFollowupRequestSchema.parse(input);
  const policy = decideFollowup(body.dispatchStatus);

  if (policy.decision === "queue_office_followup") {
    return {
      ...policy,
      workOrderId: body.workOrderId,
      answer: null,
      sources: []
    };
  }

  const retrievalPrompt = [
    `work order ${body.workOrderId}`,
    `status ${body.dispatchStatus}`,
    `photo labels ${body.photoLabels.join(", ")}`,
    body.serviceNote,
    body.technicianQuestion
  ].join("\n");

  const embedding = await embedText(retrievalPrompt);
  const queryResult = await infrai.queryVectors({
    collection: "field-service-kb",
    embedding,
    top_k: 5,
    include_metadata: true
  });

  const matches = queryResult.matches ?? [];
  const candidateTexts = matches
    .map((match) => String(match.metadata?.text ?? ""))
    .filter((text) => text.length > 0);

  const reranked = await infrai.rerank({
    query: body.technicianQuestion,
    candidates: candidateTexts,
    top_k: Math.min(3, candidateTexts.length),
    model: "cohere-rerank-3.5",
    vendor: "cohere"
  });

  const rankedTexts = (reranked.results ?? [])
    .map((result) => candidateTexts[result.index])
    .filter((text): text is string => Boolean(text));

  const context = rankedTexts.join("\n\n");
  const answer = await answerWithContext(
    `${body.technicianQuestion}\nPhoto evidence: ${body.photoLabels.join(", ")}`,
    context
  );

  return {
    ...policy,
    workOrderId: body.workOrderId,
    answer,
    sources: rankedTexts
  };
}
