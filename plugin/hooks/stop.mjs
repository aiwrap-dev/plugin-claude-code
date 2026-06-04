#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { appendFileSync, createReadStream, existsSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { homedir } from 'node:os'
import { join } from 'node:path'

const CONFIG_PATH = join(homedir(), '.aiwrap', 'settings.json')
const BASE_URL = process.env.AIWRAP_URL ?? 'https://aiwrap.dev'

const EXT_TO_LANG = {
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
  py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust', java: 'Java',
  kt: 'Kotlin', swift: 'Swift', cs: 'C#', cpp: 'C++', c: 'C',
  php: 'PHP', sh: 'Shell', bash: 'Shell', zsh: 'Shell',
  sql: 'SQL', html: 'HTML', css: 'CSS', scss: 'CSS',
  md: 'Markdown', json: 'JSON', yaml: 'YAML', yml: 'YAML',
  toml: 'TOML', dockerfile: 'Docker', tf: 'Terraform',
}

const FILE_TOOL_NAMES = new Set(['Read', 'Write', 'Edit', 'read', 'write', 'edit', 'read_file', 'write_file', 'edit_file', 'view_file', 'create_file'])
const WRITE_TOOL_NAMES = new Set(['Write', 'Edit', 'write', 'edit', 'write_file', 'edit_file', 'create_file'])
const READ_TOOL_NAMES = new Set(['Read', 'read', 'read_file', 'view_file'])
const BASH_TOOL_NAMES = new Set(['Bash', 'bash', 'run_command'])
const WRITING_EXTS = new Set(['md', 'mdx', 'txt', 'rst'])

const SENSITIVITY_THRESHOLD = { high: 0.30, medium: 0.20, low: 0.10 }

function readConfig() {
  if (!existsSync(CONFIG_PATH)) return null
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
  } catch {
    return null
  }
}

function savePluginDir() {
  const pluginDir = process.env.CLAUDE_PLUGIN_DIR
  if (!pluginDir) return
  try {
    const dir = join(homedir(), '.aiwrap')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const current = readConfig() ?? {}
    if (current.plugin_dir === pluginDir) return
    writeFileSync(CONFIG_PATH, JSON.stringify({ ...current, plugin_dir: pluginDir }, null, 2))
  } catch {
  }
}

function sessionStatePath(sessionId) {
  return join(homedir(), '.aiwrap', `session-state-${sessionId}.json`)
}

function readSessionState(sessionId) {
  const path = sessionStatePath(sessionId)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function writeSessionState(sessionId, state) {
  try {
    const dir = join(homedir(), '.aiwrap')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(sessionStatePath(sessionId), JSON.stringify(state, null, 2))
  } catch {
  }
}

function runGit(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch {
    return null
  }
}

function inferLanguages(filePaths) {
  const langs = new Map()
  for (const p of filePaths) {
    const ext = p.split('.').pop()?.toLowerCase()
    if (!ext) continue
    const lang = EXT_TO_LANG[ext]
    if (lang) langs.set(lang, (langs.get(lang) ?? 0) + 1)
  }
  return [...langs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([l]) => l)
}

function inferCategory(toolNames, filePaths) {
  const hasOnlyReads = toolNames.length > 0 && toolNames.every((t) => READ_TOOL_NAMES.has(t))
  if (hasOnlyReads) return 'research'
  const hasCoding = toolNames.some((t) => WRITE_TOOL_NAMES.has(t) || BASH_TOOL_NAMES.has(t))
  if (!hasCoding && filePaths.length > 0) {
    const writingCount = filePaths.filter((p) => {
      const ext = p.split('.').pop()?.toLowerCase()
      return ext && WRITING_EXTS.has(ext)
    }).length
    if (writingCount / filePaths.length > 0.6) return 'writing'
  }
  return hasCoding ? 'code' : 'other'
}

function getMsgTextLength(content) {
  if (typeof content === 'string') return content.length
  if (!Array.isArray(content)) return 0
  return content.reduce((sum, block) => block.type === 'text' ? sum + (block.text?.length ?? 0) : sum, 0)
}

async function parseTranscript(transcriptPath) {
  if (!existsSync(transcriptPath)) return null

  const rl = createInterface({
    input: createReadStream(transcriptPath, { encoding: 'utf8' }),
    crlfDelay: Number.POSITIVE_INFINITY,
  })

  let inputTokens = 0
  let outputTokens = 0
  let cacheReadTokens = 0
  let cacheWriteTokens = 0
  let turns = 0
  let firstTimestamp = null
  let lastTimestamp = null
  let model = null
  const toolsMap = new Map()
  const toolsSequence = []
  const filePaths = []
  const assistantTimestamps = []
  const userMsgSizes = []
  const assistMsgSizes = []

  let totalFilesWritten = 0
  const perTurnOutputTokens = []
  let lastTurnFilesWritten = 0
  let lastTurnOutputTokens = 0

  for await (const line of rl) {
    if (!line.trim()) continue
    let entry
    try { entry = JSON.parse(line) } catch { continue }

    const ts = entry.timestamp
    if (ts) {
      if (!firstTimestamp) firstTimestamp = ts
      lastTimestamp = ts
    }

    if (entry.type === 'user' && entry.message) {
      const size = getMsgTextLength(entry.message.content)
      if (size > 0) userMsgSizes.push(size)
    }

    if (entry.type === 'assistant' && entry.message) {
      turns++
      if (ts) assistantTimestamps.push(new Date(ts).getTime())
      if (entry.message.model) model = entry.message.model

      const usage = entry.message.usage
      if (usage) {
        inputTokens += usage.input_tokens ?? 0
        outputTokens += usage.output_tokens ?? 0
        cacheReadTokens += usage.cache_read_input_tokens ?? 0
        cacheWriteTokens += usage.cache_creation_input_tokens ?? 0
      }

      lastTurnOutputTokens = usage?.output_tokens ?? 0
      perTurnOutputTokens.push(lastTurnOutputTokens)

      const content = entry.message.content ?? []
      let assistSize = 0
      lastTurnFilesWritten = 0
      for (const block of content) {
        if (block.type === 'text') assistSize += block.text?.length ?? 0
        if (block.type !== 'tool_use') continue
        const name = block.name
        if (!name) continue
        toolsSequence.push(name)
        toolsMap.set(name, (toolsMap.get(name) ?? 0) + 1)
        if (FILE_TOOL_NAMES.has(name)) {
          const path = block.input?.path ?? block.input?.file_path
          if (typeof path === 'string') filePaths.push(path)
        }
        if (WRITE_TOOL_NAMES.has(name)) {
          totalFilesWritten++
          lastTurnFilesWritten++
        }
      }
      if (assistSize > 0) assistMsgSizes.push(assistSize)
    }
  }

  const durationSeconds = firstTimestamp && lastTimestamp
    ? Math.round((new Date(lastTimestamp) - new Date(firstTimestamp)) / 1000)
    : null

  const gaps = []
  for (let i = 1; i < assistantTimestamps.length; i++) {
    gaps.push((assistantTimestamps[i] - assistantTimestamps[i - 1]) / 1000)
  }
  const avgTurnGapSec = gaps.length > 0 ? gaps.reduce((a, b) => a + b) / gaps.length : null
  const minTurnGapSec = gaps.length > 0 ? Math.min(...gaps) : null
  const maxTurnGapSec = gaps.length > 0 ? Math.max(...gaps) : null
  const msgSizeAvgUser = userMsgSizes.length > 0 ? Math.round(userMsgSizes.reduce((a, b) => a + b) / userMsgSizes.length) : null
  const msgSizeAvgAssist = assistMsgSizes.length > 0 ? Math.round(assistMsgSizes.reduce((a, b) => a + b) / assistMsgSizes.length) : null
  const msgRatio = msgSizeAvgUser && msgSizeAvgAssist ? Math.round((msgSizeAvgAssist / msgSizeAvgUser) * 100) / 100 : null
  const toolsUsed = [...toolsMap.entries()].map(([name, count]) => ({ name, count }))
  const totalToolCalls = toolsUsed.reduce((s, t) => s + t.count, 0)
  const bashCalls = toolsUsed.filter((t) => BASH_TOOL_NAMES.has(t.name)).reduce((s, t) => s + t.count, 0)
  const bashPct = totalToolCalls > 0 ? Math.round((bashCalls / totalToolCalls) * 100) / 100 : null
  const languages = inferLanguages(filePaths)
  const category = inferCategory([...toolsMap.keys()], filePaths)
  const avgOutputTokens = perTurnOutputTokens.length > 1
    ? perTurnOutputTokens.slice(0, -1).reduce((a, b) => a + b) / (perTurnOutputTokens.length - 1)
    : null

  return {
    turns,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    durationSeconds,
    model,
    toolsUsed,
    toolsSequence,
    languages,
    category,
    avgTurnGapSec,
    minTurnGapSec,
    maxTurnGapSec,
    msgSizeAvgUser,
    msgSizeAvgAssist,
    msgRatio,
    bashPct,
    timestamp: firstTimestamp ?? new Date().toISOString(),
    totalFilesWritten,
    lastTurnFilesWritten,
    lastTurnOutputTokens,
    avgOutputTokens,
  }
}

const LOG_PATH = join(homedir(), '.aiwrap', 'stop.log')

function log(msg) {
  try {
    if (existsSync(LOG_PATH) && statSync(LOG_PATH).size > 1_000_000) writeFileSync(LOG_PATH, '')
    appendFileSync(LOG_PATH, `${new Date().toISOString()} ${msg}\n`)
  } catch {}
}

function hasTty() {
  try { statSync('/dev/tty'); return true } catch { return false }
}

function cleanupOldSessionStates() {
  try {
    const dir = join(homedir(), '.aiwrap')
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    for (const f of readdirSync(dir)) {
      if (!f.startsWith('session-state-') || !f.endsWith('.json')) continue
      const fp = join(dir, f)
      if (statSync(fp).mtimeMs < cutoff) unlinkSync(fp)
    }
  } catch {}
}

function readKey() {
  try {
    const fd = openSync('/dev/tty', 'r')
    const buf = Buffer.alloc(1)
    readSync(fd, buf, 0, 1, null)
    return buf.toString('utf8').toLowerCase()
  } catch {
    return null
  }
}

function printSpark(suggestion, languages, durationSec) {
  const lang = languages?.[0] ?? ''
  const dur = durationSec ? `${Math.floor(durationSec / 60)}m` : ''
  const meta = [lang, dur].filter(Boolean).join(' · ')
  process.stderr.write('\n')
  process.stderr.write('─'.repeat(60) + '\n')
  process.stderr.write(`✨ Spark detectado${meta ? '  ·  ' + meta : ''}\n\n`)
  if (suggestion.text) {
    process.stderr.write(`  "${suggestion.text}"\n\n`)
  }
  if (suggestion.code) {
    const lang = suggestion.code_lang ? `\`\`\`${suggestion.code_lang}` : '```'
    process.stderr.write(`  ${lang}\n`)
    for (const line of suggestion.code.split('\n')) {
      process.stderr.write(`  ${line}\n`)
    }
    process.stderr.write('  ```\n\n')
  }
  process.stderr.write('  [P]ost  [E]dit  [S]kip  [Q]uiet\n')
  process.stderr.write('─'.repeat(60) + '\n')
}

function readLineFromTty(prompt) {
  try {
    process.stderr.write(prompt)
    const fd = openSync('/dev/tty', 'r')
    let result = ''
    const buf = Buffer.alloc(1)
    while (true) {
      readSync(fd, buf, 0, 1, null)
      const ch = buf.toString('utf8')
      if (ch === '\n' || ch === '\r') break
      if (ch === '\x7f' || ch === '\b') {
        if (result.length > 0) {
          result = result.slice(0, -1)
          process.stderr.write('\b \b')
        }
        continue
      }
      result += ch
      process.stderr.write(ch)
    }
    process.stderr.write('\n')
    return result.trim()
  } catch {
    return ''
  }
}

async function fetchSuggestion(token, payload) {
  try {
    const res = await fetch(`${BASE_URL}/api/plugin/sparks/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function publishSpark(token, sparkData) {
  try {
    const res = await fetch(`${BASE_URL}/api/plugin/sparks/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(sparkData),
    })
    return res.ok
  } catch {
    return false
  }
}

function shouldDetectSpark(parsed, state, sparkConfig) {
  if (!sparkConfig.enabled) return false
  if (state?.quiet_until_end) return false
  if (parsed.lastTurnFilesWritten === 0) return false
  if (!hasTty()) return false

  const sensitivity = sparkConfig.sensitivity ?? 'medium'
  const threshold = SENSITIVITY_THRESHOLD[sensitivity] ?? SENSITIVITY_THRESHOLD.medium

  const avgOut = parsed.avgOutputTokens
  const lastOut = parsed.lastTurnOutputTokens
  const densityRatio = avgOut && avgOut > 0 ? lastOut / avgOut : 1
  const densityDelta = densityRatio - 1

  if (densityDelta < threshold) return false

  if (state?.last_spark_time) {
    const minInterval = (sparkConfig.min_interval_minutes ?? 10) * 60 * 1000
    const elapsed = Date.now() - new Date(state.last_spark_time).getTime()
    if (elapsed < minInterval) return false
  }

  const maxPerSession = sparkConfig.max_per_session ?? null
  if (maxPerSession !== null && (state?.sparks_this_session ?? 0) >= maxPerSession) return false

  return true
}

async function handleSparkDetection(token, sessionId, parsed, state, sparkConfig) {
  const payload = {
    session_id: sessionId,
    turn_index: parsed.turns,
    languages: parsed.languages,
    category: parsed.category,
    files_written_delta: parsed.lastTurnFilesWritten,
    output_tokens_this_turn: parsed.lastTurnOutputTokens,
    avg_output_tokens: parsed.avgOutputTokens ?? parsed.lastTurnOutputTokens,
    duration_so_far_sec: parsed.durationSeconds ?? 0,
  }

  log('fetching spark suggestion')
  const suggestion = await fetchSuggestion(token, payload)
  if (!suggestion?.text) {
    log('spark suggestion empty, skipping')
    return state
  }

  printSpark(suggestion, parsed.languages, parsed.durationSeconds)

  const key = readKey()
  log(`spark key pressed: ${key}`)

  const newState = {
    ...(state ?? {}),
    last_spark_time: new Date().toISOString(),
    sparks_this_session: (state?.sparks_this_session ?? 0) + 1,
  }

  if (key === 'p') {
    const ok = await publishSpark(token, {
      text: suggestion.text,
      code: suggestion.code ?? undefined,
      code_lang: suggestion.code_lang ?? undefined,
      session_id: sessionId,
      auto_suggested: true,
    })
    process.stderr.write(ok ? '\n✨ Spark publicado!\n\n' : '\nFailed to publish spark.\n\n')
    return newState
  }

  if (key === 'e') {
    const editedText = readLineFromTty(`\n  Texto (enter para manter): `)
    const text = editedText || suggestion.text
    const ok = await publishSpark(token, {
      text,
      code: suggestion.code ?? undefined,
      code_lang: suggestion.code_lang ?? undefined,
      session_id: sessionId,
      auto_suggested: true,
    })
    process.stderr.write(ok ? '\n✨ Spark publicado!\n\n' : '\nFailed to publish spark.\n\n')
    return newState
  }

  if (key === 'q') {
    process.stderr.write('\nSparks silenciados para esta sessão.\n\n')
    return { ...(state ?? {}), quiet_until_end: true }
  }

  process.stderr.write('\nSkipped.\n\n')
  return { ...(state ?? {}), last_spark_time: newState.last_spark_time }
}

async function main() {
  savePluginDir()
  cleanupOldSessionStates()
  log('hook fired')

  let stdin = ''
  for await (const chunk of process.stdin) stdin += chunk

  let hookData
  try {
    hookData = JSON.parse(stdin)
  } catch {
    log('exit: invalid stdin JSON')
    process.exit(0)
  }

  if (hookData.stop_hook_active) {
    log('exit: stop_hook_active')
    process.exit(0)
  }

  const config = readConfig()
  if (!config?.token) {
    log('exit: no token in config')
    process.exit(0)
  }

  const { transcript_path: transcriptPath, session_id: sessionId, cwd } = hookData
  if (!transcriptPath || !sessionId) {
    log('exit: missing transcript_path or session_id')
    process.exit(0)
  }

  log(`parsing transcript for session ${sessionId}`)
  const parsed = await parseTranscript(transcriptPath)
  if (!parsed || parsed.turns === 0) {
    log(`exit: turns=0 or parse failed`)
    process.exit(0)
  }

  log(`turns=${parsed.turns} model=${parsed.model} category=${parsed.category}`)

  const sparkConfig = config.sparks ?? { enabled: true, sensitivity: 'medium', min_interval_minutes: 10 }
  let state = readSessionState(sessionId)

  if (shouldDetectSpark(parsed, state, sparkConfig)) {
    log('spark moment detected, prompting user')
    state = await handleSparkDetection(config.token, sessionId, parsed, state, sparkConfig)
    writeSessionState(sessionId, state ?? {})
  } else {
    if (state === null) writeSessionState(sessionId, {})
  }

  const shareProjectContext = config.share_project_context !== false
  const remoteOriginUrl = shareProjectContext && cwd ? runGit('git remote get-url origin', cwd) : null
  const firstCommitHash = shareProjectContext && cwd ? runGit('git rev-list --max-parents=0 HEAD', cwd) : null
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const body = {
    plugin_session_id: sessionId,
    timestamp: parsed.timestamp,
    timezone,
    duration_seconds: parsed.durationSeconds,
    turns: parsed.turns,
    input_tokens: parsed.inputTokens,
    output_tokens: parsed.outputTokens,
    cache_read_tokens: parsed.cacheReadTokens || null,
    cache_write_tokens: parsed.cacheWriteTokens || null,
    model: parsed.model,
    category: parsed.category,
    session_outcome: 'completed',
    languages: parsed.languages,
    tools_used: parsed.toolsUsed,
    tools_sequence: parsed.toolsSequence.slice(0, 200),
    avg_turn_gap_sec: parsed.avgTurnGapSec,
    min_turn_gap_sec: parsed.minTurnGapSec,
    max_turn_gap_sec: parsed.maxTurnGapSec,
    msg_size_avg_user: parsed.msgSizeAvgUser,
    msg_size_avg_assist: parsed.msgSizeAvgAssist,
    msg_ratio: parsed.msgRatio,
    bash_pct: parsed.bashPct,
    cwd: shareProjectContext ? (cwd ?? null) : null,
    remote_origin_url: remoteOriginUrl,
    first_commit_hash: firstCommitHash,
    hardware_id: config.hardware_id ?? null,
  }

  try {
    const res = await fetch(`${BASE_URL}/api/plugin/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.token}` },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    log(`api response: ${res.status} ${text.slice(0, 200)}`)
  } catch (e) {
    log(`api error: ${e?.message}`)
  }

  process.exit(0)
}

main().catch(() => process.exit(0))
