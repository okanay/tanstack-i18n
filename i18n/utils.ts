import { CONFIG, type Language } from './config'

// ============================================================================
// TYPES
// ============================================================================

export type TranslationValue = string | number | boolean | TranslationValue[] | { [key: string]: TranslationValue }

export interface ExtractedKey {
  namespace: string
  keyPath: string
  defaultValue: TranslationValue
  location: string
}

export interface HashEntry {
  hash: string
  defaultValue: TranslationValue
}

// ============================================================================
// KEY PARSING & SKELETON
// ============================================================================

/**
 * Parses a raw key string into a namespace and key path.
 * Example: "home:title" -> { namespace: "home", keyPath: "title" }
 * Example: "welcome" -> { namespace: "translation", keyPath: "welcome" }
 * * @param raw - The raw key string found in the source code.
 */
export function parseKey(raw: string): { namespace: string; keyPath: string } {
  const parts = raw.split(':')
  if (parts.length >= 2) {
    return { namespace: parts[0], keyPath: parts.slice(1).join(':') }
  }
  return {
    namespace: CONFIG.defaultNamespace,
    keyPath: raw,
  }
}

/**
 * Generates a "skeleton" structure from the default value.
 * Preserves the structure (arrays, objects) and interpolation variables ({{name}}),
 * but removes the actual text content to prepare it for translation.
 * * @param value - The source translation value.
 * @returns A skeletal version of the value.
 */
export function generateSkeleton(value: TranslationValue): TranslationValue {
  if (Array.isArray(value)) {
    return value.map((item) => generateSkeleton(item))
  }

  if (typeof value === 'object' && value !== null) {
    const result: Record<string, TranslationValue> = {}
    for (const [k, v] of Object.entries(value)) {
      result[k] = generateSkeleton(v)
    }
    return result
  }

  if (typeof value === 'string') {
    // 1. Preserve interpolations: {{name}}
    const interpolationRegex = /\{\{[^}]+\}\}/g
    const interpolations = value.match(interpolationRegex) || []

    // 2. Preserve Component/HTML tags: <Trans>... or <br/>
    const tagRegex = /<\/?[^>]+(>|$)/g
    const tags = value.match(tagRegex) || []

    const skeletonParts = [...interpolations, ...tags]

    return skeletonParts.join(' ')
  }

  return ''
}

// ============================================================================
// OBJECT MANIPULATION (Merge & Hash)
// ============================================================================

/**
 * Deeply merges a source translation value (skeleton/code) into a target value (existing JSON).
 * Respects the 'syncTranslationsStrictly' configuration.
 * * @param target - The existing value in the translation file (e.g., TR).
 * @param source - The new value extracted from code (Source of Truth).
 */
export function mergeDeep(target: TranslationValue | undefined, source: TranslationValue): TranslationValue {
  // 1. If target doesn't exist, use the source.
  if (target === undefined || target === null) {
    return source
  }

  // 2. If types mismatch (e.g., string vs array), overwrite with source.
  if (typeof target !== typeof source) {
    return source
  }

  // 3. Array Merge: Map based on source length.
  if (Array.isArray(source) && Array.isArray(target)) {
    return source.map((sourceItem, index) => {
      return mergeDeep(target[index], sourceItem)
    })
  }

  // 4. Object Merge: The core logic for Strict vs Soft sync.
  if (typeof source === 'object' && source !== null && typeof target === 'object' && target !== null) {
    // STRICT MODE: Start with empty object. Only keys present in 'source' will be kept.
    // SOFT MODE: Start with a copy of 'target'. Old keys in 'target' are preserved.
    const result: Record<string, TranslationValue> = CONFIG.behavior.syncTranslationsStrictly ? {} : { ...(target as Record<string, any>) }

    for (const key of Object.keys(source)) {
      const sourceValue = (source as Record<string, TranslationValue>)[key]
      const targetValue = (target as Record<string, TranslationValue>)[key]

      result[key] = mergeDeep(targetValue, sourceValue)
    }

    return result
  }

  // For primitives (strings), keep the target (existing translation).
  return target
}

/**
 * Generates a quick hash of the value to detect changes.
 * Used to avoid unnecessary file writes if content hasn't changed.
 */
export function quickHash(val: TranslationValue): string {
  const str = typeof val === 'string' ? val : JSON.stringify(val)
  return Bun.hash(str).toString(16).slice(0, 8)
}

// ============================================================================
// FILE SYSTEM
// ============================================================================

/**
 * Loads a JSON file safely. Returns an empty object if file is missing/corrupt.
 */
export async function loadJsonFile(path: string): Promise<Record<string, unknown>> {
  const file = Bun.file(path)
  if (await file.exists()) {
    try {
      return await file.json()
    } catch {
      return {}
    }
  }
  return {}
}

/**
 * Saves a JSON file with sorted keys for consistent diffs.
 */
export async function saveJsonFile(path: string, data: unknown): Promise<void> {
  const sortedData = sortDeep(data)
  await Bun.write(path, JSON.stringify(sortedData, null, 2) + '\n')
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep)
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = sortDeep((value as Record<string, unknown>)[key])
          return acc
        },
        {} as Record<string, unknown>,
      )
  }
  return value
}

export async function loadHashes(): Promise<Record<string, HashEntry>> {
  const file = Bun.file(CONFIG.hashFile)
  if (await file.exists()) {
    return file.json()
  }
  return {}
}

export async function saveHashes(hashes: Record<string, HashEntry>): Promise<void> {
  await saveJsonFile(CONFIG.hashFile, hashes)
}

/**
 * Scans the messages directory to find all existing namespaces.
 */
export async function getNamespaces(lang: Language): Promise<string[]> {
  const glob = new Bun.Glob('*.json')
  const namespaces: string[] = []
  for await (const file of glob.scan(`${CONFIG.messagesDir}/${lang}`)) {
    namespaces.push(file.replace('.json', ''))
  }
  return namespaces
}

/**
 * Ensures a namespace file exists; creates it if missing.
 */
export async function ensureNamespaceFile(lang: Language, namespace: string): Promise<void> {
  const filePath = `${CONFIG.messagesDir}/${lang}/${namespace}.json`
  const file = Bun.file(filePath)
  if (!(await file.exists())) {
    await Bun.write(filePath, '{}\n')
  }
}

/**
 * Updates the `index.ts` file that exports all namespaces for a language.
 */
export async function updateIndexFile(lang: Language, namespaces: string[]): Promise<void> {
  const sorted = [...namespaces].sort()
  const imports = sorted.map((ns) => `import ${ns} from "./${ns}.json";`).join('\n')
  const exportObj = sorted.map((ns) => `  ${ns},`).join('\n')

  const content = `${imports}

const ${lang} = {
${exportObj}
} as const;

export default ${lang};
`
  await Bun.write(`${CONFIG.messagesDir}/${lang}/index.ts`, content)
}
