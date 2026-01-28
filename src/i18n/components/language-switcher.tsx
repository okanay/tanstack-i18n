import { SUPPORTED_LANGUAGES } from '@/i18n/config'
import { useLanguage } from '../provider'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="mb-2 space-y-3 border border-gray-300 bg-white p-4">
      <div className="space-y-1 text-sm text-gray-700">
        <span className="block">
          Current:{' '}
          <span className="font-semibold text-gray-900">
            {language.label} ({language.locale})
          </span>
        </span>
        <span className="block">
          Direction: <span className="font-semibold text-gray-900">{language.direction}</span>
        </span>
        <span className="block">
          Time format: <span className="font-semibold text-gray-900">{language.timepicker}</span>
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUPPORTED_LANGUAGES.map((m) => (
          <button
            key={m.value}
            onClick={() => setLanguage(m.value)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 ease-in-out ${
              language.value === m.value ? 'cursor-default bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            } `}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}
