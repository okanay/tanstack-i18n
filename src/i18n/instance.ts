import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/i18n/config'

export const initI18n = (lang: string, resources: Record<string, any>) => {
  i18n.use(initReactI18next).init({
    lng: lang,
    fallbackLng: DEFAULT_LANGUAGE.value,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.value),
    resources: {
      [lang]: resources,
    },
    defaultNS: 'translation',
    fallbackNS: [],
    ns: Object.keys(resources),
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    detection: {
      order: [],
      caches: [],
    },
  })

  return i18n
}
