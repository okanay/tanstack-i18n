import { DEFAULT_LANGUAGE, LANGUAGES_VALUES } from '@/i18n/config'

export const CONFIG = {
  // Paths
  sourceDir: 'src',
  messagesDir: 'src/messages',
  hashFile: 'i18n/hashes.json',
  backupDir: 'i18n/backups',

  // Languages
  languages: [...LANGUAGES_VALUES] as const,
  defaultLanguage: DEFAULT_LANGUAGE.value,
  defaultNamespace: 'translation',

  // Scan options
  extensions: ['ts', 'tsx'],
  ignoreDirs: ['node_modules', 'messages', '.git', 'dist'],

  // Output
  verbose: false,
} as const

export type Language = (typeof CONFIG.languages)[number]
