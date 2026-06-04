---
description: Show your AIWrap group rankings and your position in each group
disable-model-invocation: true
---

# /aiwrap:group

Show your current group rankings on AIWrap ��� see where you stand among your team.

When the user invokes this skill:

1. Read `~/.aiwrap/settings.json`. If missing or no `token`, tell the user to run `/aiwrap:setup` first.

2. Fetch groups:
   ```
   GET {BASE_URL}/api/plugin/groups
   Authorization: Bearer {token}
   ```

3. If `groups` is empty, tell the user:
   > You're not in any groups yet. Create or join one at {base}/groups

4. For each group, display a compact leaderboard:

   ```
   {group.name}  [{group.period} �� by {group.metric}]
   ���������������������������������������������������������������������������������������������������������������
   {for each member (top 10)}
   {rank}. {if your position} ��� {end}{username}  ���  {value based on metric}
   {end}
   {if myPosition} Your position: #{myPosition} {end}
   ```

   Metric formatting:
   - `points` ��� show `pointsGained` as `{n} pts`
   - `sessions` ��� show `sessions` as `{n} sessions`
   - `hours` ��� show `codingMins / 60` as `{n}h`

   Mark the current user's row with `���` (match by username from settings.json).

5. After all groups, add:
   > Full leaderboard: {base}/groups

For any URLs shown to the user, compute the base as: `process.env.AIWRAP_URL || "https://aiwrap.dev"` and substitute `{base}` with that value.
