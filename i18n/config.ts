import { DEFAULT_LANGUAGE, LANGUAGES_VALUES } from '@/i18n/config'

/**
 * Configuration object for the i18n tool.
 * Controls paths, languages, and the behavior of the extraction/cleaning process.
 */
export const CONFIG = {
  //Paths
  /** The root directory to scan for source files (e.g., 'src') */
  sourceDir: 'src',
  /** The directory where translation JSON files are stored */
  messagesDir: 'src/messages',
  /** The file path to store content hashes for change detection */
  hashFile: 'i18n/hashes.json',

  // Languages
  /** List of supported languages derived from the project config */
  languages: [...LANGUAGES_VALUES] as const,
  /** The default/source language (usually English) */
  defaultLanguage: DEFAULT_LANGUAGE.value,
  /** The default namespace to use if none is specified */
  defaultNamespace: 'translation',

  // Scan options
  /** File extensions to scan for translation keys */
  extensions: ['ts', 'tsx'],
  /** Directories to ignore during scanning to improve performance */
  ignoreDirs: ['node_modules', 'messages', '.git', 'dist'],

  // Behavior Settings
  behavior: {
    /**
     * If true, keys found in JSON files but NOT in the source code will be deleted.
     * Set to 'false' if you want to keep legacy keys in JSON files.
     */
    cleanUnusedKeys: true,

    /**
     * If true, JSON files that become empty after cleaning will be deleted.
     * Also removes the import from the index file.
     */
    removeEmptyFiles: true,

    /**
     * Keys present in TR but missing in EN (source) will be removed.
     * * If false (Soft Mode), existing keys in TR are kept even if removed from EN/Code.
     */
    syncTranslationsStrictly: true,

    /**
     * If true: New keys in target languages will be filled with the English source text.
     * If false: New keys will be filled with an empty skeleton (empty string).
     * * Example (True):  EN: "Hello" -> TR: "Hello" (User sees text, status marks as untranslated)
     * Example (False): EN: "Hello" -> TR: ""      (User sees empty, status marks as untranslated)
     */
    fillEmptyWithSource: true,
  },

  // AI Translation
  ai: {
    /** Anthropic API key — falls back to ANTHROPIC_API_KEY env variable if left empty */
    apiKey: '',
    /** Model to use for translation */
    model: 'claude-haiku-4-5-20251001',
    /** Maximum number of strings per AI call */
    batchSize: 50,
  },

  // Output
  /** Enable verbose logging for debugging purposes */
  verbose: false,
} as const

export type Language = (typeof CONFIG.languages)[number]
