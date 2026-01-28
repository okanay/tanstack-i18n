import { unlink } from 'node:fs/promises'
import { CONFIG } from './config'
import { scanAllFiles } from './extract' // AST Scanner
import { loadJsonFile, saveJsonFile, getNamespaces, updateIndexFile, loadHashes, saveHashes } from './utils'

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Flattens all keys in a JSON object into "namespace:key.path" format.
 */
function getFlattenedKeys(obj: Record<string, unknown>, namespace: string, prefix = ''): string[] {
  const keys: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key

    // If the value is an object and not an array, recurse deeper
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getFlattenedKeys(value as Record<string, unknown>, namespace, currentPath))
    } else {
      // If it's a string, array, or primitive value, it's an endpoint (Key)
      keys.push(`${namespace}:${currentPath}`)
    }
  }

  return keys
}

/**
 * Deletes a keyPath from a nested object.
 * If a parent object becomes empty, it also cleans it up (Recursively).
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

  // If there's a child object, go into it
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

export async function clean() {
  console.log('i18n: Scanning source code for used keys...')

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
      const fileKeys = getFlattenedKeys(json, ns)

      // Filter keys that are NOT in the code
      const keysToRemove = fileKeys.filter((key) => !validKeysSet.has(key))

      if (keysToRemove.length > 0) {
        console.log(`\n  Cleaning ${lang}/${ns}.json:`)

        let modified = false
        for (const fullKey of keysToRemove) {
          // fullKey format: "namespace:key.path" -> only "key.path" is needed
          const keyPath = fullKey.split(':').slice(1).join(':')

          json = removeNestedKey(json, keyPath)
          console.log(`    - ${keyPath}`)
          modified = true
          totalRemoved++
        }

        if (modified) {
          // If the file became completely empty, delete it
          if (Object.keys(json).length === 0) {
            await unlink(filePath)
            console.log(`    (File is empty, deleted)`)
            totalDeletedFiles++
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

  // 3. CLEAN THE HASH FILE (If extract didn't run, the hash might be dirty)
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
