# Trans Component for Rich Text

Use `<Trans>` when you need to include links, bold text, or other React components inside translations.

## Basic Example with Links
```tsx
import { Trans } from 'react-i18next'
import { Link } from '@tanstack/react-router'

function TermsCheckbox() {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" required />
      <span className="text-sm text-gray-600">
        <Trans
          i18nKey="auth:terms_consent"
          defaults="I agree to the <terms>Terms of Service</terms> and <privacy>Privacy Policy</privacy>."
          components={{
            terms: <Link to="/terms" className="underline text-blue-600" />,
            privacy: <Link to="/privacy" className="underline text-blue-600" />,
          }}
        />
      </span>
    </label>
  )
}
```

## Example with Bold Text
```tsx
function WelcomeMessage({ username }: { username: string }) {
  return (
    <p>
      <Trans
        i18nKey="common:welcome_message"
        defaults="Welcome back, <bold>{{username}}</bold>! You have new notifications."
        values={{ username }}
        components={{
          bold: <strong className="font-bold text-gray-900" />,
        }}
      />
    </p>
  )
}
```

## Example with Multiple Elements
```tsx
function NotificationBanner() {
  return (
    <div className="rounded bg-blue-50 p-4">
      <Trans
        i18nKey="banner:trial_ending"
        defaults="Your trial ends in <days>3 days</days>. <upgrade>Upgrade now</upgrade> to continue using all features."
        components={{
          days: <span className="font-semibold text-blue-900" />,
          upgrade: <a href="/pricing" className="font-medium text-blue-600 underline" />,
        }}
      />
    </div>
  )
}
```

## Generated JSON
```json
{
  "terms_consent": "I agree to the <terms>Terms of Service</terms> and <privacy>Privacy Policy</privacy>.",
  "welcome_message": "Welcome back, <bold>{{username}}</bold>! You have new notifications.",
  "trial_ending": "Your trial ends in <days>3 days</days>. <upgrade>Upgrade now</upgrade> to continue using all features."
}
```

## Key Points

- ✅ Use `<Trans>` for text containing HTML or React components
- ✅ `defaults` prop contains the text template with placeholders
- ✅ `components` prop maps placeholders to actual components
- ✅ Supports interpolation with `values` prop
- ✅ Extraction tool preserves the structure in JSON
- ⚠️ Placeholder names must match between `defaults` and `components`
