---
description: View or update your AIWrap coding goals
disable-model-invocation: true
---

Manage AIWrap goals. No argument ��� display current goals. With argument ��� replace all goals with the new text.

## Step 1 ��� Read token

```bash
node -e "
const fs = require('fs'), os = require('os');
const p = os.homedir() + '/.aiwrap/settings.json';
try { const c = JSON.parse(fs.readFileSync(p,'utf8')); console.log(c.token || ''); } catch { console.log(''); }
"
```

If token is empty, tell the user to run `/aiwrap:setup` first and stop.

---

## Step 2a ��� No argument: display current goals

If no argument was provided, run:

```bash
node -e "
const fs = require('fs'), os = require('os');
const { token } = JSON.parse(fs.readFileSync(os.homedir() + '/.aiwrap/settings.json', 'utf8'));
const base = process.env.AIWRAP_URL || 'https://aiwrap.dev';
fetch(base + '/api/plugin/goals', { headers: { Authorization: 'Bearer ' + token } })
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d)))
  .catch(() => console.log('{}'));
"
```

Format the `goals` array as a numbered list, stripping the `custom:` prefix from each item before displaying.

If the array is empty: "No goals set. Run `/aiwrap:goals <text>` to set one or more (use newlines for multiple). Example: `/aiwrap:goals Ship auth this week`"

Stop here.

---

## Step 2b ��� Argument provided: replace goals

Use the argument as the new goals text. Each newline or semicolon creates a separate goal.

Replace `<GOALS_JSON>` with the properly JSON-encoded goals string before running (e.g., if goals is `Ship it`, use `"Ship it"`; escape internal quotes and newlines as needed so the value is a valid JSON string literal).

```bash
node -e "
const fs = require('fs'), os = require('os');
const { token } = JSON.parse(fs.readFileSync(os.homedir() + '/.aiwrap/settings.json', 'utf8'));
const base = process.env.AIWRAP_URL || 'https://aiwrap.dev';
fetch(base + '/api/plugin/goals', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
  body: JSON.stringify({ goals: <GOALS_JSON> })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d))).catch(() => console.log('{}'));
"
```

If `ok: true`, confirm: "��� Goals updated:" and list the new goals (strip `custom:` prefix).
If error, say: "Failed to update goals. Try again or visit aiwrap.dev/settings."
