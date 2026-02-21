import { SUPPORTED_LANGUAGES } from '@/i18n/config'
import { CONFIG, type Language } from './config'
import { generateSkeleton, loadHashes, loadJsonFile, saveJsonFile, type TranslationValue } from './utils'

const BATCH_SIZE = 50

// ============================================================================
// TYPES
// ============================================================================

interface TranslationBatch {
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

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

function setNestedValue(obj: Record<string, any>, path: string, value: any): void {
  const keys = path.split('.')
  const last = keys.pop()!
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj)
  target[last] = value
}

function isTranslated(value: TranslationValue | undefined, defaultValue: TranslationValue): boolean {
  if (value == null) return false
  if (typeof value === 'string' && !value.trim()) return false
  return JSON.stringify(value) !== JSON.stringify(generateSkeleton(defaultValue))
}

// flattenStrings ve applyStrings aynı traversal sırasıyla çalışmalı
function flattenStrings(value: TranslationValue): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(flattenStrings)
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, TranslationValue>).flatMap(flattenStrings)
  }
  return []
}

function applyStrings(value: TranslationValue, strings: string[], cursor: { i: number }): TranslationValue {
  if (typeof value === 'string') return strings[cursor.i++] ?? value
  if (Array.isArray(value)) return value.map((v) => applyStrings(v, strings, cursor))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, TranslationValue>).map(([k, v]) => [k, applyStrings(v, strings, cursor)]),
    )
  }
  return value
}

// ============================================================================
// COLLECTION
// ============================================================================

async function collectUntranslated(lang: Language): Promise<UntranslatedItem[]> {
  const hashes = await loadHashes()
  const namespaces = [...new Set(Object.keys(hashes).map((k) => k.split(':')[0]))].sort()
  const items: UntranslatedItem[] = []

  for (const ns of namespaces) {
    const json = await loadJsonFile(`${CONFIG.messagesDir}/${lang}/${ns}.json`)

    const entries = Object.entries(hashes)
      .filter(([k]) => k.startsWith(ns + ':'))
      .sort(([a], [b]) => a.localeCompare(b))

    for (const [fullKey, entry] of entries) {
      const keyPath = fullKey.slice(ns.length + 1)
      if (!isTranslated(getNestedValue(json, keyPath), entry.defaultValue)) {
        items.push({ namespace: ns, keyPath, defaultValue: entry.defaultValue })
      }
    }
  }

  return items
}

// ============================================================================
// AI CALL
// ============================================================================

async function callAI(batch: TranslationBatch, langLabel: string): Promise<TranslationBatch> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

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
      system: `Translate from English to ${langLabel}. Return ONLY a JSON array with exactly ${batch.strings.length} elements. Preserve {{placeholders}} and <tags> as-is.`,
      messages: [{ role: 'user', content: JSON.stringify(batch.strings) }],
    }),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const body = (await res.json()) as any
  const raw: string = body.content[0].text

  // Find the JSON array boundaries — handles code fences gracefully
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error('No JSON array in response')

  let translated: unknown
  try {
    translated = JSON.parse(raw.slice(start, end + 1))
  } catch {
    throw new Error('Response JSON is malformed')
  }

  if (!Array.isArray(translated) || translated.length !== batch.strings.length) {
    throw new Error(`Expected ${batch.strings.length} items, got ${Array.isArray(translated) ? translated.length : 'non-array'}`)
  }

  return { ...batch, strings: translated as string[] }
}

// ============================================================================
// APPLY
// ============================================================================

async function applyTranslations(lang: Language, responses: TranslationBatch[]): Promise<number> {
  const items = await collectUntranslated(lang)
  if (!items.length) return 0

  // Precompute string counts and offsets for each item
  const counts = items.map((item) => flattenStrings(item.defaultValue).length)
  let total = 0
  const offsets = counts.map((c) => { const s = total; total += c; return s })

  // Fill translated array — null where a batch failed
  const translated: (string | null)[] = Array(total).fill(null)
  for (const { batchId, strings } of responses) {
    const start = batchId * BATCH_SIZE
    strings.forEach((s, i) => { if (start + i < total) translated[start + i] = s })
  }

  // Collect changes grouped by namespace
  const changes: Record<string, Record<string, TranslationValue>> = {}
  let count = 0

  for (let i = 0; i < items.length; i++) {
    const { namespace, keyPath, defaultValue } = items[i]
    const slice = translated.slice(offsets[i], offsets[i] + counts[i])

    if (slice.includes(null)) continue

    ;(changes[namespace] ??= {})[keyPath] = applyStrings(defaultValue, slice as string[], { i: 0 })
    count++
  }

  // Write updated JSON files
  for (const [ns, nsChanges] of Object.entries(changes)) {
    const filePath = `${CONFIG.messagesDir}/${lang}/${ns}.json`
    const json = await loadJsonFile(filePath)
    for (const [keyPath, value] of Object.entries(nsChanges)) {
      setNestedValue(json, keyPath, value)
    }
    await saveJsonFile(filePath, json)
  }

  return count
}

// ============================================================================
// MAIN
// ============================================================================

export async function translate(targetLangArg?: string) {
  const hashes = await loadHashes()
  if (!Object.keys(hashes).length) {
    console.log('No keys found. Run "extract" first.')
    return
  }

  const targetLangs = (
    targetLangArg
      ? [targetLangArg].filter((l) => CONFIG.languages.includes(l as Language) && l !== CONFIG.defaultLanguage)
      : CONFIG.languages.filter((l) => l !== CONFIG.defaultLanguage)
  ) as Language[]

  if (!targetLangs.length) {
    console.log('No target languages to translate.')
    return
  }

  const getLabel = (lang: string) => SUPPORTED_LANGUAGES.find((l) => l.value === lang)?.label ?? lang

  console.log('\nBuilding translation payloads...\n')

  const batches: TranslationBatch[] = []

  for (const lang of targetLangs) {
    const items = await collectUntranslated(lang)

    if (!items.length) {
      console.log(`  ${lang} (${getLabel(lang)}): nothing to translate`)
      continue
    }

    const strings = items.flatMap((item) => flattenStrings(item.defaultValue))
    const batchCount = Math.ceil(strings.length / BATCH_SIZE)

    for (let i = 0; i < batchCount; i++) {
      batches.push({ batchId: i, language: lang, strings: strings.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE) })
    }

    console.log(`  ${lang} (${getLabel(lang)}): ${strings.length} strings → ${batchCount} batch(es)`)
  }

  if (!batches.length) {
    console.log('\nAll languages are fully translated.')
    return
  }

  console.log(`\nFiring ${batches.length} AI call(s) in parallel...\n`)

  const results = await Promise.allSettled(batches.map((b) => callAI(b, getLabel(b.language))))

  const byLang: Record<string, TranslationBatch[]> = {}
  let failCount = 0

  for (const [i, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      ;(byLang[result.value.language] ??= []).push(result.value)
    } else {
      const { language, batchId } = batches[i]
      console.warn(`  ✗ [${language} batch ${batchId}] ${result.reason}`)
      failCount++
    }
  }

  console.log('')

  for (const [lang, responses] of Object.entries(byLang)) {
    const count = await applyTranslations(lang as Language, responses)
    console.log(`  ✓ ${lang}: ${count} key(s) translated`)
  }

  if (failCount) {
    console.log(`\n  ⚠ ${failCount} batch(es) failed. Run translate again to retry.`)
  }

  console.log('')
}
