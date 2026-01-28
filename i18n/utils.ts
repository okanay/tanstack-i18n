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
 * Generates a skeleton (empty structure) from an English text.
 * Preserves HTML tags (<br>, <Link>...) and variables ({{name}}).
 * Cleans the text content within.
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
    // It only takes the tag structure, discards the content.
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

export function mergeDeep(target: TranslationValue | undefined, source: TranslationValue): TranslationValue {
  if (target === undefined || target === null) {
    return source
  }

  // If there's a type mismatch (e.g., was string, now array), take the source.
  if (typeof target !== typeof source) {
    return source
  }

  if (Array.isArray(source) && Array.isArray(target)) {
    // In arrays, merge based on the source length.
    return source.map((sourceItem, index) => {
      return mergeDeep(target[index], sourceItem)
    })
  }

  if (typeof source === 'object' && source !== null && typeof target === 'object' && target !== null) {
    const result: Record<string, TranslationValue> = {
      ...(target as Record<string, any>),
    }

    for (const [key, sourceValue] of Object.entries(source)) {
      result[key] = mergeDeep(result[key] as TranslationValue, sourceValue)
    }

    return result
  }

  return target
}

export function quickHash(val: TranslationValue): string {
  const str = typeof val === 'string' ? val : JSON.stringify(val)
  return Bun.hash(str).toString(16).slice(0, 8)
}

// ============================================================================
// FILE SYSTEM
// ============================================================================

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

export async function getNamespaces(lang: Language): Promise<string[]> {
  const glob = new Bun.Glob('*.json')
  const namespaces: string[] = []
  for await (const file of glob.scan(`${CONFIG.messagesDir}/${lang}`)) {
    namespaces.push(file.replace('.json', ''))
  }
  return namespaces
}

export async function ensureNamespaceFile(lang: Language, namespace: string): Promise<void> {
  const filePath = `${CONFIG.messagesDir}/${lang}/${namespace}.json`
  const file = Bun.file(filePath)
  if (!(await file.exists())) {
    await Bun.write(filePath, '{}\n')
  }
}

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
