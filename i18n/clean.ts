import { unlink } from 'node:fs/promises'
import { CONFIG } from './config'
import { scanAllFiles } from './extract'
import { loadJsonFile, saveJsonFile, getNamespaces, updateIndexFile, loadHashes, saveHashes } from './utils'

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Flattens all keys in a JSON object into "namespace:key.path" format.
 * Used to compare existing keys in JSON against the keys found in code.
 * * @param obj - The JSON object from the translation file.
 * @param namespace - The current namespace.
 * @param validKeysSet - Set of keys known to exist in the code (to prevent flattening complex values).
 * @param prefix - Current path prefix (recursion).
 */
function getFlattenedKeys(obj: Record<string, unknown>, namespace: string, validKeysSet: Set<string>, prefix = ''): string[] {
  const keys: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key
    const fullKey = `${namespace}:${currentPath}`

    // If this path is a known extracted key, treat it as a leaf.
    if (validKeysSet.has(fullKey)) {
      keys.push(fullKey)
      continue
    }

    // If the value is an object and not an array, recurse deeper.
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getFlattenedKeys(value as Record<string, unknown>, namespace, validKeysSet, currentPath))
    } else {
      keys.push(fullKey)
    }
  }

  return keys
}

/**
 * Deletes a keyPath from a nested object.
 * Recursively cleans up empty parent objects.
 * * @param obj - The object to modify.
 * @param keyPath - The path of the key to remove (e.g. "section.title").
 */
function removeNestedKey(obj: Record<string, unknown>, keyPath: string): Record<string, unknown> {
  const keys = keyPath.split('.')

  // Reached the last element, delete it
  if (keys.length === 1) {
    const result = { ...obj }
    delete result[keys[0]]
    return result
  }

  const [currentKey, ...rest] = keys
  const result: Record<string, unknown> = { ...obj }

  if (currentKey in result && typeof result[currentKey] === 'object' && result[currentKey] !== null) {
    const childObj = result[currentKey] as Record<string, unknown>
    const updatedChild = removeNestedKey(childObj, rest.join('.'))

    // If the child object became completely empty, delete it from the parent
    if (Object.keys(updatedChild).length === 0) {
      delete result[currentKey]
    } else {
      result[currentKey] = updatedChild
    }
  }

  return result
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Scans the codebase for unused translation keys and removes them from JSON files.
 * Respects 'cleanUnusedKeys' and 'removeEmptyFiles' settings in config.
 */
export async function clean() {
  console.log('i18n: Scanning source code for used keys...')

  // Guard: If cleanup is disabled in config, exit early.
  if (!CONFIG.behavior.cleanUnusedKeys) {
    console.log('⚠️  Cleanup is disabled in config (cleanUnusedKeys: false). Skipping.')
    return
  }

  // 1. FIND THE ACTUAL KEYS IN THE CODE (Source of Truth)
  const validKeysMap = await scanAllFiles()
  const validKeysSet = new Set(validKeysMap.keys())

  let totalRemoved = 0
  let totalDeletedFiles = 0

  // 2. ITERATE THROUGH ALL LANGUAGES AND FILES
  for (const lang of CONFIG.languages) {
    const namespaces = await getNamespaces(lang)

    for (const ns of namespaces) {
      const filePath = `${CONFIG.messagesDir}/${lang}/${ns}.json`
      let json = await loadJsonFile(filePath)

      // Find all existing keys in the file
      const fileKeys = getFlattenedKeys(json, ns, validKeysSet)

      // Filter keys that are NOT in the code
      const keysToRemove = fileKeys.filter((key) => !validKeysSet.has(key))

      if (keysToRemove.length > 0) {
        console.log(`\n  Cleaning ${lang}/${ns}.json:`)

        let modified = false
        for (const fullKey of keysToRemove) {
          const keyPath = fullKey.split(':').slice(1).join(':')

          json = removeNestedKey(json, keyPath)
          console.log(`    - ${keyPath}`)
          modified = true
          totalRemoved++
        }

        if (modified) {
          // If the file became completely empty
          if (Object.keys(json).length === 0) {
            // Only delete the file if config allows it
            if (CONFIG.behavior.removeEmptyFiles) {
              await unlink(filePath)
              console.log(`    (File is empty, deleted)`)
              totalDeletedFiles++
            } else {
              // Otherwise, save as empty object
              await saveJsonFile(filePath, {})
              console.log(`    (File is empty, kept as {})`)
            }
          } else {
            await saveJsonFile(filePath, json)
          }
        }
      }
    }

    // Update the index file (a file might have been deleted)
    const currentNamespaces = await getNamespaces(lang)
    await updateIndexFile(lang, currentNamespaces)
  }

  // 3. CLEAN THE HASH FILE
  const hashes = await loadHashes()
  const storedHashKeys = Object.keys(hashes)
  let hashesModified = false

  for (const key of storedHashKeys) {
    if (!validKeysSet.has(key)) {
      delete hashes[key]
      hashesModified = true
    }
  }

  if (hashesModified) {
    await saveHashes(hashes)
  }

  console.log('\nCleanup complete.')
  if (totalRemoved > 0) console.log(`- Removed ${totalRemoved} unused keys.`)
  if (totalDeletedFiles > 0) console.log(`- Deleted ${totalDeletedFiles} empty files.`)
  if (totalRemoved === 0 && totalDeletedFiles === 0) console.log('- No unused keys found.')
}
