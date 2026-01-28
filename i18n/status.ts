import { CONFIG } from './config'
import { loadHashes, loadJsonFile, generateSkeleton, type TranslationValue } from './utils'

function getNestedValue(obj: any, keyPath: string): any {
  return keyPath.split('.').reduce((o, k) => (o || {})[k], obj)
}

function isTranslated(value: TranslationValue | undefined, defaultValue: TranslationValue): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string' && value.trim() === '') return false

  // Skeleton Check:
  // If the value in JSON == Skeleton, it means the translator has not touched it yet.
  const skeleton = generateSkeleton(defaultValue)

  // Deep comparison with JSON stringify
  return JSON.stringify(value) !== JSON.stringify(skeleton)
}

export async function status() {
  const hashes = await loadHashes()
  const totalKeys = Object.keys(hashes).length

  if (totalKeys === 0) {
    console.log('No keys found.')
    return
  }

  console.log(`\nTranslation Status (${totalKeys} keys)\n`)

  for (const lang of CONFIG.languages) {
    if (lang === CONFIG.defaultLanguage) continue // No need to report on the source language

    let translatedCount = 0
    const missingKeys: string[] = []
    const namespaces = new Set(Object.keys(hashes).map((k) => k.split(':')[0]))

    for (const ns of namespaces) {
      const filePath = `${CONFIG.messagesDir}/${lang}/${ns}.json`
      const json = await loadJsonFile(filePath)

      // Check all keys belonging to that namespace
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

    const percentage = Math.round((translatedCount / totalKeys) * 100)
    const bar = '█'.repeat(Math.round(percentage / 5)) + '░'.repeat(20 - Math.round(percentage / 5))

    console.log(`  ${lang.toUpperCase()} ${bar} ${percentage}%`)

    if (missingKeys.length > 0 && missingKeys.length < 10) {
      missingKeys.forEach((k) => console.log(`    - ${k}`))
    } else if (missingKeys.length >= 10) {
      console.log(`    ...and ${missingKeys.length} missing keys.`)
    }
  }
  console.log('')
}
