---
description: Load and run a saved AIWrap prompt by command name, or create a new one
disable-model-invocation: true
---

# /aiwrap:prompt

Load and run a saved prompt from AIWrap by its command name. Also supports creating new prompts.

## Usage

```
/aiwrap:prompt new <title>                    ��� create a new prompt (interactive)
/aiwrap:prompt <command>                      ��� your own prompt
/aiwrap:prompt @username/<command>            ��� public prompt from a specific user
/aiwrap:prompt <command> --save               ��� auto-save variable values without asking
/aiwrap:prompt <command> --fresh              ��� ignore cached values and re-ask all variables

/aiwrap:prompt alias <alias> @username/<cmd>  ��� create a local alias
/aiwrap:prompt alias <alias>                  ��� remove an alias
/aiwrap:prompt aliases                        ��� list all saved aliases
```

Aliases are stored locally in `~/.aiwrap/aliases.json` and let you call any prompt (including other users') with a short name of your choice.

## NEW subcommand: `new`

**If the argument starts with `new ` (e.g. `/aiwrap:prompt new My code reviewer`)** ��� handle prompt creation and stop.

### Step N1 ��� Read token

```bash
node -e "
const fs = require('fs'), os = require('os');
const p = os.homedir() + '/.aiwrap/settings.json';
try { const c = JSON.parse(fs.readFileSync(p,'utf8')); console.log(c.token || ''); } catch { console.log(''); }
"
```

If token is empty, tell the user to run `/aiwrap:setup` first and stop.

### Step N2 ��� Collect prompt details interactively

The title is everything after `new ` in the argument.

Ask the user (one at a time, waiting for each answer before the next):

1. **Content** ��� `"What's the prompt text? Use {{variable}} for placeholders (or paste it now):"`
2. **Command name** (optional) ��� `"Short command name for /aiwrap:prompt <cmd> (letters, numbers, hyphens, max 40 ��� or press Enter to skip):"`  
   - Validate: must match `^[a-z0-9-]{1,40}$` if provided. If invalid, ask again once.
3. **Category** ��� `"Category? [code / writing / research / analysis / productivity / other] (default: code):"` ��� default to `code` if empty
4. **Visibility** ��� `"Public? (y/n, default: y):"` ��� default to `true` if empty or `y`

### Step N3 ��� Create the prompt

Replace all placeholder values before running:

```bash
node -e "
const fs = require('fs'), os = require('os');
const { token } = JSON.parse(fs.readFileSync(os.homedir() + '/.aiwrap/settings.json', 'utf8'));
const base = process.env.AIWRAP_URL || 'https://aiwrap.dev';
const body = {
  title: <TITLE_JSON>,
  content: <CONTENT_JSON>,
  category: <CATEGORY_JSON>,
  tags: [],
  is_public: <IS_PUBLIC>,
  type: 'prompt'
};
const cmd = <COMMAND_JSON>;
if (cmd) body.command_name = cmd;
fetch(base + '/api/plugin/prompts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
  body: JSON.stringify(body)
}).then(r => r.json()).then(d => console.log(JSON.stringify(d))).catch(() => console.log('{}'));
"
```

If the response has an `error` with "already taken" in it, tell the user the command name is taken and ask for a different one, then retry.

If response has `id`:

Show:
```
��� Prompt "<title>" saved.
```

If a command name was set:
```
  Run it with: /aiwrap:prompt <command_name>
```

```
  Browse at: aiwrap.dev/explorer/prompts
```

If error or empty response, say: "Failed to save prompt. Try again or create it at aiwrap.dev/explorer/prompts."

**Stop here ��� do not continue to the main prompt flow.**

## Steps

### 1. Read token

```bash
node -e "
const fs = require('fs'), os = require('os');
const p = os.homedir() + '/.aiwrap/settings.json';
try { const c = JSON.parse(fs.readFileSync(p,'utf8')); console.log(c.token || ''); } catch { console.log(''); }
"
```

If the token is empty, tell the user: "AIWrap not configured. Run `/aiwrap:setup` first." and stop.

Strip `--save` and `--fresh` flags from the argument before any other parsing.

---

### 2. Handle alias management commands (if argument matches)

**If argument is `aliases`** ��� list all saved aliases:

```bash
node -e "
const fs = require('fs'), os = require('os');
const p = os.homedir() + '/.aiwrap/aliases.json';
try { console.log(fs.readFileSync(p,'utf8')); } catch { console.log('{}'); }
"
```

Format and show the result as a table: `alias ��� target`. Stop here.

---

**If argument starts with `alias `** ��� create or remove an alias:

Parse: `alias <name> [target]`

- **Remove** (no target provided):

```bash
node -e "
const fs = require('fs'), os = require('os');
const p = os.homedir() + '/.aiwrap/aliases.json';
const a = (() => { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return {}; } })();
delete a['<name>'];
fs.writeFileSync(p, JSON.stringify(a, null, 2));
console.log('removed');
"
```

Tell the user: "��� Alias `<name>` removed." and stop.

- **Create** (target provided, must start with `@username/command`):

```bash
node -e "
const fs = require('fs'), os = require('os');
const p = os.homedir() + '/.aiwrap/aliases.json';
const a = (() => { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return {}; } })();
a['<name>'] = '<target>';
fs.writeFileSync(p, JSON.stringify(a, null, 2));
console.log('saved');
"
```

Tell the user: "��� Alias `<name>` ��� `<target>` saved. You can now use `/aiwrap:prompt <name>` to load it." and stop.

---

### 3. Resolve the command

The lookup order for a plain command (no `@`):

1. **Own prompt** ��� check if the user has a prompt with this command name (step 4 below)
2. **Local alias** ��� check `~/.aiwrap/aliases.json` for a matching key, resolve to `@username/command`
3. **Not found** ��� stop

Read aliases:

```bash
node -e "
const fs = require('fs'), os = require('os');
const p = os.homedir() + '/.aiwrap/aliases.json';
try { console.log(fs.readFileSync(p,'utf8')); } catch { console.log('{}'); }
"
```

- If the argument already starts with `@` ��� skip alias lookup, go straight to step 4 with `user=<username>` and `command=<cmd>`
- If a matching alias exists ��� resolve to its target and treat it as a `@username/command` reference

### 4. Fetch the prompt

```bash
node -e "
const fs = require('fs'), os = require('os');
const cfg = JSON.parse(fs.readFileSync(os.homedir() + '/.aiwrap/settings.json', 'utf8'));
const base = process.env.AIWRAP_URL || 'https://aiwrap.dev';
const command = '<command>';
const userParam = '<username>' ? '?user=<username>' : '';
fetch(base + '/api/plugin/prompts/' + command + userParam, {
  headers: { Authorization: 'Bearer ' + cfg.token }
}).then(r => r.json()).then(d => console.log(JSON.stringify(d))).catch(() => console.log('{}'));
"
```

If response has no `prompt` key:
- If it came from an alias, tell the user: "Prompt `<alias>` ��� `<target>` not found. The target prompt may have been deleted or made private."
- Otherwise tell the user: "Prompt `<command>` not found. Use `/aiwrap:prompt alias <name> @username/<cmd>` to add an alias, or check your prompts at aiwrap.dev/prompts."

Stop in both cases.

### 5. Branch by type

Check `prompt.type` in the response:

- If `prompt.type === 'flow'` ��� jump to **FLOW MODE** below
- Otherwise ��� continue with **PROMPT MODE** below

---

## PROMPT MODE

### P1. Detect variables

The API returns `variables` ��� an array of `{ name, defaultValue, required }` objects using `{{variable}}` syntax.

If `variables` is empty ��� skip to P3.

### P2. Resolve variable values

The cache key is the fully resolved command (e.g. `cr` resolved via alias to `@victor/code-review` uses key `@victor/code-review`).

**Check cache first** (unless `--fresh` flag was passed):

```bash
node -e "
const fs = require('fs'), os = require('os');
const p = os.homedir() + '/.aiwrap/prompt-defaults.json';
try { console.log(fs.readFileSync(p,'utf8')); } catch { console.log('{}'); }
"
```

The cache is a JSON object: `{ "<resolved-command>": { "var1": "val1", "var2": "val2" } }`

For each variable in the `variables` array:
- If already provided inline in the skill argument (e.g. `name=foo`), use that value
- Else if a non-empty cached value exists (and `--fresh` is not set), use it silently
- Else if `required` is false and `defaultValue` is set, use the default silently
- Otherwise ask the user: *"What's the value for **`{{<name>}}`**?"* and wait for the reply before moving on

### P3. Apply variables and use the prompt

Replace occurrences in `prompt.content`:
- `{{variable}}` ��� the resolved value (or empty string if none)
- `{{variable|default}}` ��� the resolved value, or `default` if not provided
- `{{#if variable}}...content...{{/if}}` ��� include content only if the variable has a non-empty value

Use the fully substituted prompt text as the context for this conversation ��� treat it as if the user wrote it as an instruction.

Tell the user briefly: *"��� Prompt **`<title>`** loaded."* then act on it immediately.

### P4. Offer to save variable values (if any were asked interactively)

If at least one variable was asked interactively (not from cache, inline, or default):
- If `--save` flag was provided: save silently without asking
- Otherwise ask: *"Save these values for next time? (y/n)"*
  - If yes: write to `~/.aiwrap/prompt-defaults.json` using the resolved command as the key, merging with existing content

```bash
node -e "
const fs = require('fs'), os = require('os');
const p = os.homedir() + '/.aiwrap/prompt-defaults.json';
const existing = (() => { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return {}; } })();
existing['<resolved-command>'] = { <key>: '<value>' };
fs.writeFileSync(p, JSON.stringify(existing, null, 2));
console.log('saved');
"
```

Confirm: *"��� Values saved. Next time you run `/aiwrap:prompt <command>` they'll be used automatically."*

---

## FLOW MODE

A flow is a sequence of chained prompt steps. Each step builds on the previous. Since you are the AI running inside Claude Code, **you execute each step directly** ��� no copy-paste needed.

The API response includes `flowContent` (the parsed flow object) and `varNames` (detected variable names across all steps).

`flowContent` has:
- `variables`: array of `{ name, description, default }` ��� global vars with metadata
- `steps`: array of `{ id, title, prompt, dependsOnPrevious, outputTemplate }`

### F1. Collect global variable values

Build the full variable list:
- Start with all entries in `flowContent.variables`
- Add any names from `varNames` not already in `flowContent.variables` (detected from step prompts, no metadata)
- Exclude the reserved name `previous_output` ��� it is filled automatically between steps

**Check cache first** (unless `--fresh` was passed) ��� use the resolved command as cache key:

```bash
node -e "
const fs = require('fs'), os = require('os');
const p = os.homedir() + '/.aiwrap/prompt-defaults.json';
try { console.log(fs.readFileSync(p,'utf8')); } catch { console.log('{}'); }
"
```

For each variable:
- If already provided inline in the skill argument (e.g. `name=foo`), use that value
- Else if a non-empty cached value exists (and `--fresh` is not set), use it silently
- Else if the variable has a `default`, show it and ask: *"**`{{<name>}}`** ��� <description> (default: `<default>`, press Enter to use it)"*
  - If the user presses Enter / sends empty, use the default
- Otherwise ask: *"What's the value for **`{{<name>}}`**? ��� <description>"* and wait

If there are no variables at all, skip directly to F2.

Once all values are collected, confirm: *"��� Variables set. Starting flow **`<title>`** ��� `<N>` steps."*

### F2. Execute each step sequentially

Maintain a `previousOutput` string (starts as empty string `""`).

For each step at index `i` (1-based for display):

**F2a. Assemble the step prompt:**

1. Take `step.prompt` as the base text
2. Replace every `{{varName}}` with the collected value for that variable
3. If `step.dependsOnPrevious` is true, replace `{{previous_output}}` with `previousOutput`; otherwise remove any `{{previous_output}}` occurrences
4. If `step.outputTemplate` is set, append to the prompt:
   ```
   
   ---
   Format your response as:
   <outputTemplate>
   ```

**F2b. Show step header and execute:**

Display: `**Step <i>/<N>: <step.title>**`

Then process the assembled prompt as a task ��� provide a complete, thorough response to it. This response is the step output.

**F2c. Store output for next step:**

Set `previousOutput` to your response text from F2b. This will be injected as `{{previous_output}}` in the next step (if it uses `dependsOnPrevious`).

After each step (except the last), show a brief separator so the user knows the next step is starting.

### F3. Complete

After all steps finish, tell the user:

*"��� Flow **`<title>`** complete ��� all `<N>` steps done."*

If the user wants to run the flow again (with different inputs), they can use `/aiwrap:prompt <command> --fresh`.

### F4. Save variable values (if any were asked interactively)

Same as P4 ��� offer to cache the values under the resolved command key unless `--save` or `--fresh` was used.
