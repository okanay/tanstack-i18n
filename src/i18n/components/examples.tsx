import { Trans } from 'react-i18next'

export function TermsCheckbox() {
  return (
    <div className="flex items-start gap-x-2">
      <input type="checkbox" id="terms" className="mt-1" />
      <label htmlFor="terms" className="text-sm text-gray-700">
        <Trans
          i18nKey="home:accept_terms"
          defaults="I accept the <termsLink>Terms of Service</termsLink> and <privacyLink>Privacy Policy</privacyLink>."
          components={{
            termsLink: <a href="/terms" className="text-blue-600 underline hover:text-blue-800" />,
            privacyLink: <a href="/privacy" className="text-blue-600 underline hover:text-blue-800" />,
          }}
        />
      </label>
    </div>
  )
}
