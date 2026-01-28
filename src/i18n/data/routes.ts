export const LOCALIZED_ROUTES = {
  en: {
    '/': '/',
    '/about': '/about',
    '/contact': '/contact',
    '/products': '/products',
    '/products/search': '/products/search',
    '/products/$slug': '/products/$slug',
    '/products/$slug/payment': '/products/$slug/payment',
  },
  tr: {
    '/': '/tr',
    '/about': '/hakkimizda',
    '/contact': '/iletisim',
    '/products': '/urunler',
    '/products/search': '/urunler/arama',
    '/products/$slug': '/urunler/$slug',
    '/products/$slug/payment': '/urunler/$slug/odeme',
  },
  fr: {
    '/': '/fr',
    '/about': '/environ',
    '/contact': '/nous-contacter',
    '/products': '/produits',
    '/products/search': '/produits/recherche',
    '/products/$slug': '/produits/$slug',
    '/products/$slug/payment': '/produits/$slug/paiement',
  },
} as const satisfies Record<LanguageValue, Record<string, string>>
