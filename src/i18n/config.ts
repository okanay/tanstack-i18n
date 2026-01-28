declare global {
  type Language = (typeof SUPPORTED_LANGUAGES)[number]
  type LanguageValue = Language['value']
  type LanguageLocale = Language['locale']
}

export const SUPPORTED_LANGUAGES = [
  {
    flag: 'united-kingdom',
    label: 'English',
    value: 'en',
    locale: 'en-US',
    ogLocale: 'en_US',
    direction: 'ltr',
    timepicker: '12H',
    supportLocale: ['en-US', 'en-GB', 'en-CA', 'en-AU', 'en-IE', 'en-NZ', 'en-ZA', 'en'],
    default: true,
  },
  {
    flag: 'turkey',
    label: 'Türkçe',
    value: 'tr',
    locale: 'tr-TR',
    ogLocale: 'tr_TR',
    supportLocale: ['tr-TR', 'tr-CY', 'tr'],
    direction: 'ltr',
    timepicker: '24H',
    default: false,
  },
  {
    flag: 'france',
    label: 'Français',
    value: 'fr',
    locale: 'fr-FR',
    ogLocale: 'fr_FR',
    supportLocale: ['fr-FR', 'fr-BE', 'fr-CA', 'fr-CH', 'fr'],
    direction: 'ltr',
    timepicker: '24H',
    default: false,
  },
] as const

export const LANGUAGES_VALUES = SUPPORTED_LANGUAGES.map((language) => language.value)
export const DEFAULT_LANGUAGE: Language = SUPPORTED_LANGUAGES.find((lang) => lang.default)!

export const I18N_STORAGE_KEY = 'language'
export const I18N_COOKIE_NAME = 'language'
