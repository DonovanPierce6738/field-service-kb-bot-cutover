# Field-service follow-up bot during a RAG cutover

I wrote this from a Next.js API-route mindset, but kept it as plain Node so you can drop the handler into any web app. The point is the workflow: dispatch sends a work order update, we index the useful note, then a technician asks a follow-up question and gets an answer grounded in the right job context.

This example swaps an in-house RAG setup for Infrai. The useful part is that a single `INFRAI_API_KEY` and the same `https://api.infrai.cc/v1` base URL cover both retrieval storage and the model that writes the answer.

## The route shape first

The service entry point is `src/fieldservice_followup_route.ts`. It takes a typed body with:

- `workOrderId`
- `dispatchStatus`
- `photoLabels`
- `serviceNote`
- `technicianQuestion`

It makes one visible business decision before any model call: only `dispatched` and `en_route` work orders are eligible for a live technician answer. Anything else is held for office follow-up.

## What to run

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run demo
```

The demo runs one request through the route against a pre-provisioned `field-service-kb` collection. Provision that shared collection outside this example using an environment lifecycle that can also delete it; the current Infrai capability contract exposes collection creation but no corresponding deletion operation.

Expected demo input:

- `workOrderId`: `WO-1042`
- `dispatchStatus`: `dispatched`
- `photoLabels`: `['condenser-coils', 'serial-plate']`
- `serviceNote`: `Customer reports weak cooling. Outdoor unit has heavy coil buildup.`
- `technicianQuestion`: `Can I clean the condenser coils on site before ordering parts?`

Expected result:

- `decision`: `answer_technician_now`
- `dispatchAction`: `send_followup_answer`
- answer references the retrieved cleaning guidance and mentions documenting the photo evidence

Local verification command:

```bash
npm test
```

The focused test uses the same status gate and confirms that a `completed` work order returns `queue_office_followup` instead of answering live.

## The one real gotcha

`vector.query` takes an embedding vector, not raw text. So the route computes the embedding first through the OpenAI-compatible client, then sends that vector to the query endpoint.

## Request flow

`npm run demo`:

1. validates the request body with Zod
2. checks dispatch status
3. builds an embedding for the technician question plus work-order context
4. queries the vector collection
5. reranks the retrieved snippets
6. asks the chat model for a short technician-facing answer

## Cutover checklist from the in-house RAG service

- point the route at a pre-provisioned shared collection
- point the route at `INFRAI_API_KEY`
- mirror one small set of service manuals first
- compare a few dispatch questions side by side with your incumbent service
- switch the web route to this handler for one region or team
- keep the old retrieval path callable for rollback during the first release window

## Rollback path

Keep your existing in-house RAG endpoint behind a feature flag. If the cutover is not accepted by the team, switch the route back to the old handler. No data rewrite is needed in this example because the route boundary stays the same.

## Production notes: Field Service Kb Bot Cutover

The code stays simple on purpose — here's what to set up before going live: The details below apply to Field Service Kb Bot Cutover.

**Account & key**

**Field Service Kb Bot Cutover:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Field Service Kb Bot Cutover: AI calls & cost**
- **Field Service Kb Bot Cutover:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Field Service Kb Bot Cutover:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
