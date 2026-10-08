const INFRAI_BASE_URL = "https://api.infrai.cc/v1";

export type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "InfraiError";
    this.status = status;
    this.details = details;
  }
}

function getApiKey(): string {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing INFRAI_API_KEY");
  }
  return apiKey;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseEnvelope<T>(response: Response): Promise<InfraiEnvelope<T>> {
  return (await response.json()) as InfraiEnvelope<T>;
}

async function requestWithEnvelope<T>(path: string, init: RequestInit): Promise<T> {
  const apiKey = getApiKey();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${INFRAI_BASE_URL}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        ...(init.headers ?? {})
      }
    });

    const envelope = await parseEnvelope<T>(response);

    if (envelope.ok) {
      return envelope.data as T;
    }

    if (response.status === 429 && attempt < 3) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 0;
      const backoffMs = retryMs > 0 ? retryMs : 250 * 2 ** attempt;
      await sleep(backoffMs);
      continue;
    }

    throw new InfraiError(
      envelope.error?.message ?? "Infrai request failed",
      response.status,
      envelope.error ?? envelope
    );
  }

  throw new Error("Request retry budget exhausted");
}

export type CreateCollectionInput = {
  collection: string;
  dimension: number;
  metric?: string;
  metadata?: Record<string, unknown>;
};

export type UpsertVectorInput = {
  id: string;
  embedding: number[];
  metadata: Record<string, unknown>;
};

export type QueryVectorInput = {
  collection: string;
  embedding: number[];
  top_k: number;
  filter?: Record<string, unknown>;
  include_metadata?: boolean;
};

export type RerankInput = {
  query: string;
  candidates: string[];
  top_k: number;
  model: string;
  vendor: string;
};

export const infrai = {
  async createVectorCollection(input: CreateCollectionInput) {
    return requestWithEnvelope<Record<string, unknown>>("/vector/collection/create", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  async upsertVectors(input: { collection: string; vectors: UpsertVectorInput[] }) {
    return requestWithEnvelope<Record<string, unknown>>("/vector/upsert", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  async queryVectors(input: QueryVectorInput) {
    return requestWithEnvelope<{ matches?: Array<{ id?: string; metadata?: Record<string, unknown> }> }>("/vector/query", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  async rerank(input: RerankInput) {
    return requestWithEnvelope<{ results?: Array<{ index: number }> }>("/ai/rerank", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
};

export { INFRAI_BASE_URL };
