# The assistant

An in-app assistant that reads the venue's live state and executes actions on it. It lives in
`apps/api/src/ai`, behind `POST /establishments/:establishmentId/ai` (and `/ai/stream`), and is
driven from a panel in the workspace top bar (`presentation/establishments/workspace/components/ai-assistant`).

It is a tool-calling loop over the Vercel AI SDK, pointed at the AI Gateway: `zai/glm-4.7` with
four fallbacks listed in order, so a model being unavailable is a slower answer rather than an
outage. `AI_GATEWAY_API_KEY` is the only credential, and it is read by the SDK, not by our code.

## It cannot do more than the caller can

This is the part worth reading. Every tool goes through `createToolRunner`, and the runner takes the
required `EstablishmentPermission` as its **first argument**:

```ts
runner.execute(EstablishmentPermission.ESTABLISHMENT_DELETE_PRODUCT, new DeleteProductCommand(...))
```

It then checks `hasPermission(establishmentRole, permission)` — the same function, the same table,
the same array that `EstablishmentPermissionsGuard` reads — and on failure returns a `denied` result
that tells the model to say so and stop rather than retry. There is no path from a tool to a
repository: tools dispatch the same CQRS commands and queries the HTTP controllers dispatch, so every
invariant, event and realtime notification happens exactly as it would from a button.

Three consequences:

- A `STAFF` member asking the assistant to delete a product gets told they cannot, not a deletion.
- A new permission on a command covers the assistant the day it is added; nothing in `ai/` lists
  permissions of its own.
- The prompt is not a security boundary. It is told what the caller may do — `getRolePermissions`
  fills that section — but only so it can decline gracefully. The refusal is in the runner.

The controller sits behind `FirebaseAuthGuard` and `EstablishmentPermissionsGuard` like everything
else, so membership is settled before the model is reached, and a platform `ADMIN` gets the same
`OWNER` treatment they get everywhere.

## Which tools exist depends on the modules

`getAiTools` composes the tool set from `EstablishmentSettings.modules`:

| Module      | Tools                         |
| ----------- | ----------------------------- |
| `ORDERS`    | tables, orders, statistics    |
| `INVENTORY` | products, categories          |
| always      | shifts and exchanges, members |

A tool for a module the venue does not run **does not exist in the conversation** — it is not
described, not offered and not refused. That is cheaper than refusing it and removes a whole class of
"the assistant offered me something the app does not have".

## What one message costs

Two independent caps, both measured rather than guessed.

**A context budget bounds one message.** Before the model is called, the handler takes a snapshot of
the venue — tables, categories, open orders and the product catalogue — and puts it in the system
prompt so ordinary questions need no tool call at all. The catalogue is the only unbounded part, so
`formatProducts` is capped at `PRODUCT_BUDGET_CHARS` (12 000): past that the list is dropped entirely
and the prompt tells the model to call `listProducts` with a search term instead. Dropped, not
truncated — half a catalogue is worse than none, because the model cannot tell which half it has.

The snapshot is also only fetched for enabled modules, and the prompt says explicitly that it was
taken at the start of the turn: anything else (past days, revenue, shifts, stock alerts) has to be
read with a tool rather than guessed.

**A monthly allowance bounds how many arrive.** `AiUsage` counts messages per establishment per
calendar month, and the limit is 500 for a paying venue, 100 on trial —
`AI_MONTHLY_MESSAGES` and `AI_TRIAL_MONTHLY_MESSAGES` override both. Over the limit is
`403 AI_QUOTA_EXCEEDED`, and `GET /establishments/:establishmentId/ai/usage` is what the UI shows.
Nothing about the conversation is stored: `AiUsage` holds a count and a `YYYY-MM` string.

History is trimmed to the last 10 messages and a turn stops after 8 tool steps.

## Rate limit

`POST .../ai` is throttled to **20 requests/minute**, against the global 300. It calls a paid
gateway, and without the tighter limit any member could burn the budget in a loop — the monthly
allowance would stop it, but only after it had been spent.

## Streaming

`POST .../ai/stream` hijacks the Fastify reply and writes SSE frames itself: `delta` per token,
`done` with the final `AiResponse`. A gateway failure is still sent as a `done` frame carrying an
error key, never as a broken stream — the panel has something to render either way.

This is unrelated to the realtime stream in [the shared cache](../operations/redis.md); it is one
request answering one prompt, with no bus behind it.

## Money and language

Money crosses this boundary in euros and only here. Everywhere else in Coaster an amount is integer
cents; the assistant formats to euros in the snapshot and in its tool results, because it is talking
to a person.

The answer follows `UserPreferences.language`, not the establishment's.
