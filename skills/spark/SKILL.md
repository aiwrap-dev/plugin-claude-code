---
description: Post a spark ��� capture a key insight or snippet from your current work
disable-model-invocation: false
---

# /aiwrap:spark [text]

Post a spark to AIWrap directly from your session. A spark is a short highlight ��� an insight, a snippet, or a breakthrough moment worth saving.

When the user invokes this skill:

1. Read `~/.aiwrap/settings.json`. If missing or no `token`, tell the user to run `/aiwrap:setup` first.

2. **Get the spark text:**
   - If the user provided text after the command (e.g. `/aiwrap:spark Found that X causes Y`), use that as the spark text.
   - If no text was provided, ask the user: "What's the insight or snippet you want to capture?" Wait for their response.

3. **Optionally ask for a code snippet** ��� only if the text clearly references code or the user volunteered one. Skip otherwise.

4. Post the spark:
   ```
   POST {BASE_URL}/api/plugin/sparks/publish
   Authorization: Bearer {token}
   Content-Type: application/json

   {
     "text": "<spark text, max 500 chars>",
     "code": "<optional code snippet>",
     "code_lang": "<optional language, e.g. typescript>",
     "is_public": true
   }
   ```

5. On success (`ok: true`), tell the user:
   > ��� Spark posted! View it at {base}/sparks

   On error, show the error message and suggest trying again.

For any URLs shown to the user, compute the base as: `process.env.AIWRAP_URL || "https://aiwrap.dev"` and substitute `{base}` with that value.
