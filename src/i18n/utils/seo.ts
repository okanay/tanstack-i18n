import { DEFAULT_LANGUAGE } from '@/i18n/config'
import { SEO, DEFAULT_SEO } from '@/i18n/data/seo'

type RouteId = keyof (typeof SEO)[typeof DEFAULT_LANGUAGE.value]

export const getSeoMetadata = (path: RouteId, lang: string = DEFAULT_LANGUAGE.value) => {
  const seo = SEO[lang as keyof typeof SEO]?.[path] ?? DEFAULT_SEO

  return [
    { title: seo.title },
    { name: 'description', content: seo.description },
    { property: 'og:title', content: seo.og.title },
    { property: 'og:description', content: seo.og.description },
  ]
}
