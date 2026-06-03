---
description: Show how to enable AIWrap WebMCP to expose your data as live MCP tools in the browser
disable-model-invocation: true
---

Get the username from AIWrap config:

```bash
node -e "
const fs = require('fs'), os = require('os');
const p = os.homedir() + '/.aiwrap/settings.json';
try {
  const c = JSON.parse(fs.readFileSync(p,'utf8'));
  if (!c.token) { console.log('not-configured'); process.exit(0); }
  const base = process.env.AIWRAP_URL || 'https://aiwrap.dev';
  fetch(base + '/api/plugin/stats', { headers: { Authorization: 'Bearer ' + c.token } })
    .then(r => r.json())
    .then(d => console.log(d.username || 'unknown'))
    .catch(() => console.log('unknown'));
} catch { console.log('not-configured'); }
"
```

If output is `not-configured`, tell the user to run `/aiwrap:setup` first and stop.

Using the username (replace `<USERNAME>` below), display this guide:

---

## AIWrap WebMCP

WebMCP (`navigator.modelContext`) exposes your AIWrap data as live MCP tools inside the browser. Once active, any WebMCP-compatible AI open in the same browser (Claude.ai, etc.) can call your data directly ��� no copy-paste needed.

**Where to activate:** open your dashboard at `https://aiwrap.dev/dashboard`
A status dot appears on your avatar: ���� green = active �� ���� amber = supported but inactive �� ��� gray = not available.
Click the dot to open the setup guide.

---

### How to enable

**Path A ��� Chrome 146+**
1. Open in Chrome: `chrome://flags/#enable-webmcp`
2. Enable the flag ��� restart Chrome
3. Open `https://aiwrap.dev/dashboard` ��� dot turns green ���

**Path B ��� Any browser**
1. Install the MCP-B extension: https://mcp-b.ai
2. Refresh `https://aiwrap.dev/dashboard` ��� dot turns green ���

---

### Available tools (11)

**Read (6):**
- `aiwrap_get_context` ��� streak, rank, tier, points, goals in one call
- `aiwrap_get_sessions` ��� recent sessions with model, languages, outcome (accepts `limit`)
- `aiwrap_get_achievements` ��� earned achievements + next to unlock
- `aiwrap_get_prompts` ��� full prompt library
- `aiwrap_get_groups` ��� group memberships + current period rankings
- `aiwrap_get_webhooks` ��� configured webhooks (secret masked)

**Write (5):**
- `aiwrap_create_prompt` ��� add a prompt to your library
- `aiwrap_update_goals` ��� replace your AI goals
- `aiwrap_post_spark` ��� publish a spark to the feed
- `aiwrap_create_webhook` ��� create a webhook endpoint
- `aiwrap_invite_to_group` ��� invite a user to a group you admin

---

Tools are registered when the dashboard is open and unregistered when you close it or sign out.
Your profile: `https://aiwrap.dev/<USERNAME>`
