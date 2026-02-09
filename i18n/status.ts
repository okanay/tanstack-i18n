import { CONFIG } from './config'
import { loadHashes, loadJsonFile, generateSkeleton, type TranslationValue } from './utils'

/**
 * Helper to retrieve a nested value from an object safely.
 * @param obj - The object to traverse.
 * @param keyPath - The dot-notation path (e.g., "header.title").
 */
function getNestedValue(obj: any, keyPath: string): any {
  return keyPath.split('.').reduce((o, k) => (o || {})[k], obj)
}

/**
 * Checks if a key is effectively translated.
 * It compares the current value in JSON against the generated skeleton of the default value.
 * If they are identical, it implies the translator hasn't touched it yet.
 * * @param value - The value found in the translation JSON file.
 * @param defaultValue - The default value defined in the source code.
 */
function isTranslated(value: TranslationValue | undefined, defaultValue: TranslationValue): boolean {
  // 1. Missing value is obviously not translated
  if (value === undefined || value === null) return false

  // 2. Empty string is not translated
  if (typeof value === 'string' && value.trim() === '') return false

  // 3. Skeleton Check:
  // If the JSON value matches the skeleton (e.g. "{{name}} profile"),
  // it means it's just the placeholder, not a real translation.
  const skeleton = generateSkeleton(defaultValue)

  // Deep comparison using JSON stringify
  return JSON.stringify(value) !== JSON.stringify(skeleton)
}

/**
 * Scans all keys found in the source code (hashes) and checks their status
 * in the target language JSON files.
 * Reports a progress percentage and lists missing keys.
 */
export async function status() {
  const hashes = await loadHashes()
  const totalKeys = Object.keys(hashes).length

  if (totalKeys === 0) {
    console.log('No keys found in source code. Run "extract" first.')
    return
  }

  console.log(`\nTranslation Status (${totalKeys} keys found in code)\n`)

  for (const lang of CONFIG.languages) {
    if (lang === CONFIG.defaultLanguage) continue // Skip source language

    let translatedCount = 0
    const missingKeys: string[] = []

    // derive namespaces from the hash keys (e.g., "common:hello" -> "common")
    const namespaces = new Set(Object.keys(hashes).map((k) => k.split(':')[0]))

    for (const ns of namespaces) {
      const filePath = `${CONFIG.messagesDir}/${lang}/${ns}.json`
      const json = await loadJsonFile(filePath)

      // Filter hashes to get only keys belonging to the current namespace
      const nsKeys = Object.entries(hashes).filter(([k]) => k.startsWith(ns + ':'))

      for (const [fullKey, entry] of nsKeys) {
        const keyPath = fullKey.split(':')[1]
        const value = getNestedValue(json, keyPath)

        if (isTranslated(value, entry.defaultValue)) {
          translatedCount++
        } else {
          missingKeys.push(fullKey)
        }
      }
    }

    // Calculate percentage
    const percentage = totalKeys === 0 ? 0 : Math.round((translatedCount / totalKeys) * 100)

    // Create a visual progress bar
    const filled = Math.round(percentage / 5)
    const empty = 20 - filled
    const bar = '█'.repeat(filled) + '░'.repeat(empty)

    // Color coding based on completion
    const color = percentage === 100 ? '\x1b[32m' : percentage < 50 ? '\x1b[31m' : '\x1b[33m'
    const reset = '\x1b[0m'

    console.log(`  ${lang.toUpperCase()} ${color}${bar} ${percentage}%${reset}`)

    // List missing keys (limited to 5 to avoid clutter)
    if (missingKeys.length > 0) {
      if (missingKeys.length < 5) {
        missingKeys.forEach((k) => console.log(`    - ${k}`))
      } else {
        missingKeys.slice(0, 5).forEach((k) => console.log(`    - ${k}`))
        console.log(`    ...and ${missingKeys.length - 5} more missing keys.`)
      }
    }
  }
  console.log('')
}
