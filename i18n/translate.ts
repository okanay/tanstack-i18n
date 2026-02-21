import { SUPPORTED_LANGUAGES } from '@/i18n/config'
import { CONFIG, type Language } from './config'
import { generateSkeleton, loadHashes, loadJsonFile, saveJsonFile, type TranslationValue } from './utils'

const BATCH_SIZE = 50

// ============================================================================
// TYPES
// ============================================================================

interface TranslationBatchRequest {
  batchId: number
  language: string
  strings: string[]
}

interface TranslationBatchResponse {
  batchId: number
  language: string
  strings: string[]
}

interface UntranslatedItem {
  namespace: string
  keyPath: string
  defaultValue: TranslationValue
}

// ============================================================================
// HELPERS
// ============================================================================

function getNestedValue(obj: any, keyPath: string): any {
  return keyPath.split('.').reduce((o, k) => (o || {})[k], obj)
}

function setNestedValue(obj: Record<string, any>, keyPath: string, value: any): void {
  const keys = keyPath.split('.')
  let cur = obj
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof cur[keys[i]] !== 'object' || cur[keys[i]] === null) cur[keys[i]] = {}
    cur = cur[keys[i]]
  }
  cur[keys[keys.length - 1]] = value
}

function isTranslated(value: TranslationValue | undefined, defaultValue: TranslationValue): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string' && value.trim() === '') return false
  const skeleton = generateSkeleton(defaultValue)
  return JSON.stringify(value) !== JSON.stringify(skeleton)
}

/**
 * Flattens a TranslationValue to leaf strings only.
 * Traversal order must stay identical to applyStrings.
 */
function flattenStrings(value: TranslationValue): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap((item) => flattenStrings(item))
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).flatMap((k) => flattenStrings((value as Record<string, TranslationValue>)[k]))
  }
  return [] // number, boolean — not translatable
}

/**
 * Reconstructs a TranslationValue by replacing string leaves with translated strings.
 * Traversal order must stay identical to flattenStrings.
 */
function applyStrings(value: TranslationValue, strings: string[], cursor: { i: number }): TranslationValue {
  if (typeof value === 'string') {
    return strings[cursor.i++] ?? value
  }
  if (Array.isArray(value)) {
    return value.map((item) => applyStrings(item, strings, cursor))
  }
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, TranslationValue> = {}
    for (const k of Object.keys(value)) {
      result[k] = applyStrings((value as Record<string, TranslationValue>)[k], strings, cursor)
    }
    return result
  }
  return value // number, boolean — unchanged
}

// ============================================================================
// COLLECTION
// ============================================================================

/**
 * Collects all untranslated items for a given language in a deterministic order.
 * Called twice: once during build (to create payloads) and once during apply
 * (to re-derive positions without keeping them in memory).
 */
async function collectUntranslated(lang: Language): Promise<UntranslatedItem[]> {
  const hashes = await loadHashes()
  const namespaces = [...new Set(Object.keys(hashes).map((k) => k.split(':')[0]))].sort()
  const items: UntranslatedItem[] = []

  for (const ns of namespaces) {
    const filePath = `${CONFIG.messagesDir}/${lang}/${ns}.json`
    const json = await loadJsonFile(filePath)

    const nsKeys = Object.entries(hashes)
      .filter(([k]) => k.startsWith(ns + ':'))
      .sort(([a], [b]) => a.localeCompare(b))

    for (const [fullKey, entry] of nsKeys) {
      const keyPath = fullKey.split(':')[1]
      const currentValue = getNestedValue(json, keyPath)

      if (!isTranslated(currentValue, entry.defaultValue)) {
        items.push({ namespace: ns, keyPath, defaultValue: entry.defaultValue })
      }
    }
  }

  return items
}

// ============================================================================
// AI CALL
// ============================================================================

async function callAI(payload: TranslationBatchRequest, langLabel: string): Promise<TranslationBatchResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: `You are a professional translator. Translate from English to ${langLabel}. Return ONLY a valid JSON array with exactly ${payload.strings.length} elements. Preserve {{variable}} placeholders and <tag> HTML/JSX tags exactly as-is. Do not add or remove elements.`,
      messages: [{ role: 'user', content: JSON.stringify(payload.strings) }],
    }),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)

  const data = (await res.json()) as any
  const raw: string = data.content[0].text.trim()

  // Strip potential markdown code fences
  const text = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

  let translated: unknown
  try {
    translated = JSON.parse(text)
  } catch {
    throw new Error(`Invalid JSON in response: ${text.slice(0, 200)}`)
  }

  if (!Array.isArray(translated) || translated.length !== payload.strings.length) {
    throw new Error(
      `Expected ${payload.strings.length} items, got ${Array.isArray(translated) ? translated.length : 'non-array'}`,
    )
  }

  return { batchId: payload.batchId, language: payload.language, strings: translated as string[] }
}

// ============================================================================
// APPLY
// ============================================================================

async function applyTranslations(lang: Language, responses: TranslationBatchResponse[]): Promise<number> {
  // Re-collect in the same deterministic order used during build
  const items = await collectUntranslated(lang)
  if (items.length === 0) return 0

  // Compute per-item offsets in the flat string array
  const offsets: number[] = []
  let total = 0
  for (const item of items) {
    offsets.push(total)
    total += flattenStrings(item.defaultValue).length
  }

  // Fill translated slots — null where a batch failed
  const translated: (string | null)[] = new Array(total).fill(null)
  for (const response of responses) {
    const start = response.batchId * BATCH_SIZE
    for (let i = 0; i < response.strings.length; i++) {
      if (start + i < total) translated[start + i] = response.strings[i]
    }
  }

  // Build changes per namespace
  const nsChanges: Record<string, Record<string, TranslationValue>> = {}
  let appliedCount = 0

  for (let idx = 0; idx < items.length; idx++) {
    const { namespace, keyPath, defaultValue } = items[idx]
    const start = offsets[idx]
    const count = flattenStrings(defaultValue).length
    const slice = translated.slice(start, start + count)

    if (slice.some((s) => s === null)) continue // this item's batch failed — skip

    const newValue = applyStrings(defaultValue, slice as string[], { i: 0 })
    if (!nsChanges[namespace]) nsChanges[namespace] = {}
    nsChanges[namespace][keyPath] = newValue
    appliedCount++
  }

  // Write JSON files
  for (const [ns, changes] of Object.entries(nsChanges)) {
    const filePath = `${CONFIG.messagesDir}/${lang}/${ns}.json`
    const json = await loadJsonFile(filePath)
    for (const [keyPath, value] of Object.entries(changes)) {
      setNestedValue(json, keyPath, value)
    }
    await saveJsonFile(filePath, json)
  }

  return appliedCount
}

// ============================================================================
// MAIN
// ============================================================================

export async function translate(targetLangArg?: string) {
  const hashes = await loadHashes()
  if (Object.keys(hashes).length === 0) {
    console.log('No keys found. Run "extract" first.')
    return
  }

  const targetLanguages = (
    targetLangArg
      ? [targetLangArg].filter((l) => CONFIG.languages.includes(l as Language) && l !== CONFIG.defaultLanguage)
      : CONFIG.languages.filter((l) => l !== CONFIG.defaultLanguage)
  ) as Language[]

  if (targetLanguages.length === 0) {
    console.log('No target languages to translate.')
    return
  }

  console.log('\nBuilding translation payloads...\n')

  // Build all payloads across all languages
  const payloads: TranslationBatchRequest[] = []
  const langMeta: Record<string, { label: string }> = {}

  for (const lang of targetLanguages) {
    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.value === lang)
    const label = langConfig?.label ?? lang

    const items = await collectUntranslated(lang)
    if (items.length === 0) {
      console.log(`  ${lang} (${label}): nothing to translate`)
      continue
    }

    const allStrings = items.flatMap((item) => flattenStrings(item.defaultValue))
    let batchCount = 0

    for (let i = 0; i * BATCH_SIZE < allStrings.length; i++) {
      payloads.push({
        batchId: i,
        language: lang,
        strings: allStrings.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
      })
      batchCount++
    }

    langMeta[lang] = { label }
    console.log(`  ${lang} (${label}): ${allStrings.length} strings → ${batchCount} batch(es)`)
  }

  if (payloads.length === 0) {
    console.log('\nAll languages are fully translated.')
    return
  }

  console.log(`\nFiring ${payloads.length} AI call(s) in parallel...\n`)

  // Fire all calls simultaneously
  const results = await Promise.allSettled(payloads.map((p) => callAI(p, langMeta[p.language]?.label ?? p.language)))

  // Group fulfilled responses by language
  const fulfilledByLang: Record<string, TranslationBatchResponse[]> = {}
  let failedCount = 0

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { language } = result.value
      if (!fulfilledByLang[language]) fulfilledByLang[language] = []
      fulfilledByLang[language].push(result.value)
    } else {
      console.warn(`  ✗ Batch failed: ${result.reason}`)
      failedCount++
    }
  }

  // Apply per language
  console.log('')
  for (const [lang, responses] of Object.entries(fulfilledByLang)) {
    const count = await applyTranslations(lang as Language, responses)
    console.log(`  ✓ ${lang}: ${count} key(s) translated`)
  }

  if (failedCount > 0) {
    console.log(`\n  ⚠ ${failedCount} batch(es) failed. Run translate again to retry skipped keys.`)
  }

  console.log('')
}
