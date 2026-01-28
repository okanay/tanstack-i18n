import { createContext, useContext } from 'react'
import { I18nextProvider } from 'react-i18next'
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/i18n/config'
import { initI18n } from './instance'
import { buildLanguageSwitchUrl } from './rewrite'

interface LanguageContextValue {
  language: Language
  setLanguage: (value: LanguageValue) => void
}

interface LanguageProviderProps {
  children: React.ReactNode
  initialLanguageValue: LanguageValue
  initialResources: Record<string, unknown>
}

export const LanguageProvider = ({ children, initialLanguageValue, initialResources }: LanguageProviderProps) => {
  const i18n = initI18n(initialLanguageValue, initialResources)
  const language = findLanguage(initialLanguageValue)

  const setLanguage = (newLang: LanguageValue) => {
    if (newLang === initialLanguageValue) return

    const { pathname, search, hash } = window.location
    const newUrl = buildLanguageSwitchUrl(pathname, search, hash, initialLanguageValue, newLang)

    window.location.href = newUrl
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LanguageContext.Provider>
  )
}

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }

  return context
}

const findLanguage = (value: LanguageValue): Language => {
  return SUPPORTED_LANGUAGES.find((lang) => lang.value === value) ?? DEFAULT_LANGUAGE
}

const LanguageContext = createContext<LanguageContextValue | null>(null)
