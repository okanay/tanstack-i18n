import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/i18n/config'
import { LOCALIZED_ROUTES } from '@/i18n/data/routes'

const BASE_URL = import.meta.env.VITE_CANONICAL_URL || 'http://localhost:3000'

export type RouteId = keyof (typeof LOCALIZED_ROUTES)['en']

interface SeoLink {
  rel: 'canonical' | 'alternate'
  href: string
  hrefLang?: string
}

/**
 * Type-Safe Canonical Link Generator
 */
export const getCanonicalLinks = (routeId: RouteId, currentLang: string = DEFAULT_LANGUAGE.value, params: string[] = []): SeoLink[] => {
  const urlMap = new Map<string, string>()

  for (const lang of SUPPORTED_LANGUAGES) {
    const routes = LOCALIZED_ROUTES[lang.value as keyof typeof LOCALIZED_ROUTES]
    const pattern = routes[routeId]

    if (pattern) {
      const filledPath = fillPattern(pattern, params)
      const isRootWithLangPrefix = routeId === '/' && filledPath === `/${lang.value}`
      const href = isRootWithLangPrefix ? `${BASE_URL}${filledPath}` : `${BASE_URL}/${lang.value}${filledPath === '/' ? '' : filledPath}`

      urlMap.set(lang.value, href)
    }
  }

  const links: SeoLink[] = []

  // 1. Canonical
  const canonicalUrl = urlMap.get(currentLang)
  if (canonicalUrl) {
    links.push({ rel: 'canonical', href: canonicalUrl })
  }

  // 2. Alternate
  for (const lang of SUPPORTED_LANGUAGES) {
    const href = urlMap.get(lang.value)
    if (href) {
      links.push({ rel: 'alternate', hrefLang: lang.value, href })
    }
  }

  // 3. X-Default
  const xDefaultUrl = urlMap.get(DEFAULT_LANGUAGE.value)
  if (xDefaultUrl) {
    links.push({ rel: 'alternate', hrefLang: 'x-default', href: xDefaultUrl })
  }

  return links
}

const fillPattern = (pattern: string, params: string[]): string => {
  let paramIndex = 0
  return pattern
    .split('/')
    .map((segment) => (segment.startsWith('$') ? params[paramIndex++] || segment : segment))
    .join('/')
}
