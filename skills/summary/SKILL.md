---
description: List your recent AIWrap summaries ��� AI-generated narratives of your coding periods
disable-model-invocation: true
---

# /aiwrap:summary

Show your recent AIWrap summaries ��� AI-generated narratives that capture what you built, learned, and accomplished over a time period.

When the user invokes this skill:

1. Read `~/.aiwrap/settings.json`. If missing or no `token`, tell the user to run `/aiwrap:setup` first.

2. Fetch summaries:
   ```
   GET {BASE_URL}/api/plugin/summary
   Authorization: Bearer {token}
   ```

3. If `summaries` is empty, tell the user:
   > No summaries yet. Generate one at {base}/dashboard/activity ��� pick a time range and let your AI provider write your developer story.

4. If summaries exist, display them as a compact list:

   ```
   Your Summaries

   1. {range_label}
      "{headline}"
      {tone} �� {if is_public}public{else}private{end} �� {created_at formatted as YYYY-MM-DD}
      ��� {url}

   2. ...
   ```

   After the list, add:
   > Generate a new summary at {base}/dashboard/activity

For any URLs shown to the user, compute the base as: `process.env.AIWRAP_URL || "https://aiwrap.dev"` and substitute `{base}` with that value.
