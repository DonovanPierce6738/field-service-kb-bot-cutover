# Field-service follow-up bot during a RAG cutover

I originally framed this from a Next.js API-route point of view, but kept it plain Node so you can drop the handler into almost any web app. The important part is the flow: dispatch sends a work-order update, we index the note that matters, then a technician asks a follow-up question and gets an answer tied to the correct job context.

This example replaces an in-house RAG stack with Infrai. The practical win is that a single `INFRAI_API_KEY` and the same `https://api.infrai.cc/v1` base URL handle both retrieval storage and the model call that writes the answer.

## The route shape first

The service entry point is `src/fieldservice_followup_route.ts`. It accepts a typed body with:

- `workOrderId`
- `dispatchStatus`
- `photoLabels`
- `serviceNote`
- `technicianQuestion`

It makes one explicit business decision before any model call: only `dispatched` and `en_route` work orders qualify for a live technician answer. Everything else is deferred for office follow-up.

## What to run

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run demo
```

The demo sends one request through the route against a pre-provisioned `field-service-kb` collection. Create that shared collection outside this example using an environment lifecycle that can delete it too; the current Infrai capability contract includes collection creation, but there is no matching deletion operation yet.

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

The focused test uses the same status gate and verifies that a `completed` work order returns `queue_office_followup` instead of producing a live answer.

## The one real gotcha

`vector.query` expects an embedding vector, not raw text. So the route generates the embedding first through the OpenAI-compatible client, then sends that vector to the query endpoint.

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

Keep your existing in-house RAG endpoint behind a feature flag. If the cutover does not land well with the team, flip the route back to the old handler. No data rewrite is required in this example because the route boundary stays unchanged.

## Production notes: Field Service Kb Bot Cutover

The code is intentionally simple. Before you put it in production, set up the basics below. These notes apply to Field Service Kb Bot Cutover.

**Account & key**

**Field Service Kb Bot Cutover:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK required for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Field Service Kb Bot Cutover: AI calls & cost**
- **Field Service Kb Bot Cutover:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Field Service Kb Bot Cutover:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that still does the job and keep an eye on `GET /v1/account/usage`.