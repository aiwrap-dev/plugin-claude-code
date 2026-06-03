---
description: Authorize this device with AIWrap to start tracking sessions
disable-model-invocation: true
---

# /aiwrap:setup

Run the AIWrap setup to authorize this device.

When the user invokes this skill:

1. Find the setup script:
   - Run: `node -e "const fs=require('fs'),os=require('os'),p=os.homedir()+'/.aiwrap/settings.json';try{const c=JSON.parse(fs.readFileSync(p,'utf8'));console.log(c.plugin_dir||'')}catch{console.log('')}"`
   - If non-empty, use `<result>/bin/setup.mjs`
   - If empty: `find ~ -path "*/aiwrap-claude-plugin/bin/setup.mjs" -maxdepth 8 2>/dev/null | head -1`

2. Run: `node "<path>"` ��� exits in ~1s, outputs 3 lines:
   - `setup:<url>` or `reconfigure:<url>`
   - `expires:<minutes>`
   - `prev-token:<token or empty>`

3. Extract the URL and prev-token from the output. Tell the user:
   - If `setup:` ��� "AIWrap setup ready! Open this URL in your browser to authorize:\n\n**<url>**\n\nThe link expires in <minutes> minutes. Waiting for authorization���"
   - If `reconfigure:` ��� "New authorization link generated. Open this URL in your browser:\n\n**<url>**\n\nThe link expires in <minutes> minutes. Waiting for authorization���"

4. Wait for authorization by running: `node "<path>" --wait "<prev-token>"`
   - This blocks until the user approves in the browser (up to 10 min)
   - If output is `authorized` ��� tell the user: "��� AIWrap authorized! Sessions will be tracked automatically."
   - If output is `timeout` ��� tell the user: "Authorization timed out. Run /aiwrap:setup to try again."
