---
description: Show your AIWrap developer insights ��� readiness score, top skills, and work patterns
disable-model-invocation: true
---

# /aiwrap:insights

Show a developer insights snapshot from AIWrap: readiness score, top languages, category breakdown, and dominant work pattern.

When the user invokes this skill:

1. Read the token from `~/.aiwrap/settings.json` (key: `token`). If missing, tell the user to run `/aiwrap:setup` first.

2. Fetch insights:
   ```
   GET {BASE_URL}/api/plugin/insights
   Authorization: Bearer {token}
   ```
   Where `BASE_URL` is `{base}` (or `AIWRAP_URL` env var if set).

3. If the request fails or returns an error, tell the user and stop.

4. Display the results in this format:

```
AIWrap Insights

Readiness Score: {readiness_score} / {readiness_max}  ({readiness_pct}%)
���������������������������������������������������������������������������������������������������������������
{for each dimension}
  {label}: {score}/{max}
{end}

Top Languages
���������������������������������������
{for each top_language}
  {name}  ���  {sessions} sessions{if avg_resolution}  ��  {avg_resolution}% resolution{end}
{end}

Category Breakdown
������������������������������������������������������
{for each top_category}
  {name}  ���  {sessions} sessions{if avg_resolution}  ��  {avg_resolution}% resolution{end}
{end}

Work Pattern: {dominant_pattern}
Avg Resolution: {avg_resolution}%

��� Full insights dashboard: {dashboard_url}
```

- Omit `avg_resolution` lines if the value is null.
- If `top_languages` is empty, show "No language data yet ��� sessions need language tracking enabled."
- Cap displayed languages at 5 and categories at all returned.

For any URLs shown to the user, compute the base as: `process.env.AIWRAP_URL || "https://aiwrap.dev"` and substitute `{base}` with that value.
