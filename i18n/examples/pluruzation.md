# Pluralization and Context Examples

This example demonstrates how to use pluralization, context, and the `<Trans>` component.

## Code
```tsx
import { useTranslation, Trans } from 'react-i18next'

export function UserDashboard({
  userCount,
  userRole
}: {
  userCount: number
  userRole: 'admin' | 'user' | 'guest'
}) {
  const { t } = useTranslation(['dashboard'])

  return (
    <div className="p-4">
      {/* 1. PLURALIZATION (Pluralization) */}
      <h1>
        {t('stats.active_users', {
          count: userCount,
          defaultValue: 'One active user', // count === 1
          defaultValue_other: '{{count}} active users', // count !== 1
        })}
      </h1>

      {/* 2. CONTEXT (Contextual Text) */}
      <p>
        {t('role_description', {
          context: userRole,
          defaultValue: 'Welcome, guest!', // context === 'guest' or undefined
          defaultValue_admin: 'Welcome, Administrator. You have full access.',
          defaultValue_user: 'Welcome back, User.',
        })}
      </p>

      {/* 3. TRANS COMPONENT (Links, Bold, HTML) */}
      <div className="text-sm text-gray-500">
        <Trans
          i18nKey="dashboard:legal.terms_agreement"
          defaults="By continuing, you agree to our <terms>Terms of Service</terms> and <privacy>Privacy Policy</privacy>."
          components={{
            terms: <a href="/terms" className="underline text-blue-600" />,
            privacy: <a href="/privacy" className="underline text-blue-600" />,
          }}
        />
      </div>
    </div>
  )
}
```

## Key Concepts

### 1. Pluralization
- Use `count` parameter
- `defaultValue` for singular (count === 1)
- `defaultValue_other` for plural (count !== 1)
- `{{count}}` interpolates the number

### 2. Context
- Use `context` parameter
- `defaultValue` for fallback/default context
- `defaultValue_[context]` for specific contexts
- Common contexts: `male`, `female`, `admin`, `user`, etc.

### 3. Trans Component
- Use for text with HTML elements or React components
- `defaults` prop contains the text template
- `components` prop maps placeholders to actual components
- Maintains proper translation structure

## Generated JSON Example
```json
{
  "stats": {
    "active_users": "One active user",
    "active_users_other": "{{count}} active users"
  },
  "role_description": "Welcome, guest!",
  "role_description_admin": "Welcome, Administrator. You have full access.",
  "role_description_user": "Welcome back, User.",
  "legal": {
    "terms_agreement": "By continuing, you agree to our <terms>Terms of Service</terms> and <privacy>Privacy Policy</privacy>."
  }
}
```
