import 'i18next'
import en from '@/messages/en'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    nsSeparator: ':'
    keySeparator: '.'
    compatibilityJSON: 'v4'
    resources: typeof en
  }
}
