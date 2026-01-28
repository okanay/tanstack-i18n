import { DEFAULT_LANGUAGE, LANGUAGES_VALUES } from '@/i18n/config'
import { LOCALIZED_ROUTES } from '@/i18n/data/routes'

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Localized URL → Internal URL (for Router)
 *
 * /fr/billets/paris → /fr/tickets/paris
 * /biletler/paris → /en/tickets/paris
 */
export const deLocalizeUrl = (url: URL): URL => {
  const { lang, path } = parseUrl(url.pathname)
  const newUrl = new URL(url)
  const internalPath = toInternal(path, lang)

  newUrl.pathname = internalPath ? buildInternalUrl(internalPath, lang) : buildInternalUrl(path, lang)

  return newUrl
}

/**
 * Internal URL → Localized URL (to be shown to the user)
 *
 * /fr/tickets/paris → /fr/billets/paris
 * /tickets/paris → /tickets/paris (default language)
 */
export const localizeUrl = (url: URL): URL => {
  const { lang, path } = parseUrl(url.pathname)
  const newUrl = new URL(url)
  const localizedPath = toLocalized(path, lang)

  if (localizedPath) {
    newUrl.pathname = buildLocalizedUrl(localizedPath, lang)
  }

  return newUrl
}

/**
 * Build a new URL for language switching
 *
 * currentUrl: "/tr/biletler/paris?q=test#section"
 * newLang: "fr"
 * → "/fr/billets/paris?q=test#section"
 */
export const buildLanguageSwitchUrl = (
  currentPathname: string,
  currentSearch: string,
  currentHash: string,
  currentLang: LanguageValue,
  newLang: LanguageValue,
): string => {
  const { path: localizedPath } = parseUrl(currentPathname)
  const internalPath = toInternal(localizedPath, currentLang)
  const newLocalizedPath = internalPath ? toLocalized(internalPath, newLang) : null
  const finalPath = newLocalizedPath ?? '/'

  return `${buildLocalizedUrl(finalPath, newLang)}${currentSearch}${currentHash}`
}

/**
 * Parse the URL
 *
 * "/fr/billets/paris" → { lang: "fr", path: "/billets/paris" }
 * "/about" → { lang: "en", path: "/about" }
 */
export const parseUrl = (pathname: string): ParsedUrl => {
  const segments = toSegments(pathname)
  const first = segments[0]

  if (first && isLangSegment(first)) {
    return { lang: first, path: toPath(segments.slice(1)) || '/' }
  }

  return { lang: DEFAULT_LANGUAGE.value, path: pathname || '/' }
}

// ============================================================================
// PATH TRANSLATION
// ============================================================================

/**
 * Localized path → Internal path
 * "/biletler/paris" (tr) → "/tickets/paris"
 */
export const toInternal = (localizedPath: string, lang: LanguageValue): string | null => {
  const patterns = getSortedPatterns(lang)

  for (const [internal, localized] of patterns) {
    const params = matchPattern(localizedPath, localized)
    if (params) return fillPattern(internal, params)
  }

  return null
}

/**
 * Internal path → Localized path
 * "/tickets/paris" (tr) → "/biletler/paris"
 */
export const toLocalized = (internalPath: string, lang: LanguageValue): string | null => {
  if (internalPath === '/') return '/'

  const patterns = getSortedPatterns(lang)

  for (const [internal, localized] of patterns) {
    const params = matchPattern(internalPath, internal)
    if (params) return fillPattern(localized, params)
  }

  return null
}

// ============================================================================
// URL BUILDERS
// ============================================================================

/** Add language prefix to internal URL */
const buildInternalUrl = (internalPath: string, lang: LanguageValue): string => {
  if (lang === DEFAULT_LANGUAGE.value) return internalPath
  if (internalPath === '/') return `/${lang}`
  return `/${lang}${internalPath}`
}

/** Add language prefix to localized URL */
const buildLocalizedUrl = (localizedPath: string, lang: LanguageValue): string => {
  if (lang === DEFAULT_LANGUAGE.value) return localizedPath
  if (localizedPath === '/') return `/${lang}`
  return `/${lang}${localizedPath}`
}

// ============================================================================
// PATTERN MATCHING
// ============================================================================

/**
 * Match path with pattern
 *
 * path: "/billets/paris/vip"
 * pattern: "/billets/$slug/$"
 * → { slug: "paris", _splat: "vip" }
 */
const matchPattern = (path: string, pattern: string): Record<string, string> | null => {
  const pathSegs = toSegments(path)
  const patternSegs = toSegments(pattern)
  const params: Record<string, string> = {}

  for (let i = 0; i < patternSegs.length; i++) {
    const pat = patternSegs[i]
    const seg = pathSegs[i]

    if (isSplat(pat)) {
      const remaining = pathSegs.slice(i)
      if (remaining.length === 0) return null
      params._splat = remaining.join('/')
      return params
    }

    if (seg === undefined) return null
    if (isParam(pat)) {
      params[pat.slice(1)] = seg
      continue
    }
    if (pat !== seg) return null
  }

  return pathSegs.length === patternSegs.length ? params : null
}

/**
 * Fill pattern with params
 *
 * pattern: "/tickets/$slug/$"
 * params: { slug: "paris", _splat: "vip" }
 * → "/tickets/paris/vip"
 */
const fillPattern = (pattern: string, params: Record<string, string>): string => {
  const filled = toSegments(pattern).map((seg) => {
    if (isSplat(seg)) return params._splat ?? ''
    if (isParam(seg)) return params[seg.slice(1)] ?? seg
    return seg
  })

  return toPath(filled.filter(Boolean))
}

/** Sort patterns by priority (static > param > splat) */
const getSortedPatterns = (lang: LanguageValue): [string, string][] => {
  const map = LOCALIZED_ROUTES[lang]
  if (!map) return []

  const priority = (p: string) => toSegments(p).reduce((s, seg) => s + (isSplat(seg) ? 1 : isParam(seg) ? 10 : 100), 0)

  return Object.entries(map).sort(([a], [b]) => priority(b) - priority(a))
}

// ============================================================================
// SEGMENT UTILS
// ============================================================================

/** "/fr/billets/paris" → ["fr", "billets", "paris"] */
const toSegments = (path: string): string[] => path.split('/').filter(Boolean)

/** ["fr", "billets", "paris"] → "/fr/billets/paris" */
const toPath = (segments: string[]): string => '/' + segments.join('/')

/** Is segment a language code? */
const isLangSegment = (segment: string): segment is LanguageValue => LANGUAGES_VALUES.includes(segment as LanguageValue)

/** Is it a dynamic param? ($slug) */
const isParam = (seg: string): boolean => seg.startsWith('$') && seg !== '$'

/** Is it a splat? ($) */
const isSplat = (seg: string): boolean => seg === '$'

// ============================================================================
// TYPES
// ============================================================================

interface ParsedUrl {
  lang: LanguageValue
  path: string
}
