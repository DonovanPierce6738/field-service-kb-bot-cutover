import { infrai } from "../lib/infrai_client.js";
import { embedText } from "../lib/openai_infrai.js";

const COLLECTION_NAME = "field-service-kb";

const manualEntries = [
  {
    id: "manual-condenser-cleaning",
    text: "If condenser coils show visible debris or buildup, clean the coils on site before replacing components. Record before-and-after photos and verify airflow after cleaning.",
    topic: "coil-cleaning"
  },
  {
    id: "manual-serial-plate",
    text: "Capture the serial plate whenever a part order may be needed. Include the full model and serial in the work-order note so dispatch can match parts without a second visit.",
    topic: "documentation"
  },
  {
    id: "manual-weak-cooling",
    text: "For weak cooling complaints, inspect condenser condition, filter restriction, and thermostat settings before opening a parts request.",
    topic: "triage"
  }
];

async function seed() {
  await infrai.createVectorCollection({
    collection: COLLECTION_NAME,
    dimension: 1536,
    metric: "cosine",
    metadata: { domain: "field-service" }
  });

  const vectors = [] as Array<{ id: string; embedding: number[]; metadata: Record<string, unknown> }>;

  for (const entry of manualEntries) {
    const embedding = await embedText(entry.text);
    vectors.push({
      id: entry.id,
      embedding,
      metadata: {
        text: entry.text,
        topic: entry.topic
      }
    });
  }

  await infrai.upsertVectors({
    collection: COLLECTION_NAME,
    vectors
  });

  console.log(`Seeded ${vectors.length} field-service knowledge entries into ${COLLECTION_NAME}.`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
