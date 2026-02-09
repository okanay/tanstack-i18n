# PROJECT CONTEXT & I18N RULES

This project utilizes a custom, **AST-based Code-First I18n Extraction Tool**.
Standard manual JSON editing workflows are STRICTLY FORBIDDEN.

---

## CORE PHILOSOPHY

1. **Source of Truth:** The TypeScript code (specifically `defaultValue` props) is the single source of truth.
2. **No Manual JSON:** Never edit `messages/en/*.json`. They are auto-generated via `bun run i18n:extract`.
3. **React Compiler:** We use React 19 + React Compiler. Do NOT use `useMemo` or `useCallback` for optimization.

---

## 1. THE `t()` FUNCTION RULES

Every translation call MUST strictly follow this format:

### A. Namespace & Key

- **Format:** `t('namespace:key.path', ...)`
- **Namespace:** Corresponds to the filename in `messages/en/`.
- **Key:** Nested path using dot notation.

### B. Default Value (MANDATORY)

- The extraction tool scans the AST (Abstract Syntax Tree).
- You MUST provide a `defaultValue`.
- **Rule:** If `defaultValue` is missing, the extraction tool ignores the key.
```tsx
// ✅ CORRECT
t('common:actions.save', { defaultValue: 'Save Changes' })

// ❌ WRONG (Missing defaultValue)
t('common:actions.save')

// ❌ WRONG (Missing namespace)
t('save', { defaultValue: 'Save' })
```

---

## 2. STATIC DATA WITH `returnObjects`

For static lists and objects (navbars, footers, pricing plans, config), use getter functions with `returnObjects: true`.

### Example: Navigation Array
```typescript
import type { TFunction } from 'i18next'

export interface NavItem {
  label: string
  href: string
}

export const getMainNavigation = (t: TFunction<'navigation'>): NavItem[] => {
  return t('navigation:main_menu', {
    returnObjects: true, // ⚠️ REQUIRED for arrays/objects
    defaultValue: [
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/products' },
      { label: 'Contact', href: '/contact' },
    ],
  }) as NavItem[]
}
```

### Example: Single Object (Config)
```typescript
export interface SiteConfig {
  name: string
  email: string
}

export const getSiteConfig = (t: TFunction<'common'>): SiteConfig => {
  return t('common:site_config', {
    returnObjects: true,
    defaultValue: {
      name: 'My App',
      email: 'support@example.com',
    },
  }) as SiteConfig
}
```

### Usage in Components
```tsx
function Header() {
  const { t } = useTranslation(['navigation'])
  const navItems = getMainNavigation(t)

  return (
    <nav>
      {navItems.map((item) => (
        <a key={item.href} href={item.href}>
          {item.label}
        </a>
      ))}
    </nav>
  )
}
```

### Key Points

- ✅ `returnObjects: true` is MANDATORY
- ✅ Type-safe with interfaces
- ✅ Template literals and constants are resolved
- ✅ Function names typically start with `get`
- ❌ Never manually edit JSON arrays/objects

---

## 3. ZOD VALIDATION (Factory Pattern)

Wrap Zod schemas in factory functions that accept the `t` function. React Compiler handles optimization automatically.

### Basic Example
```typescript
import { z } from 'zod'
import type { TFunction } from 'i18next'

export type ContactFormValues = z.infer<ReturnType<typeof createContactSchema>>

export const createContactSchema = (t: TFunction<'validation'>) => {
  return z.object({
    email: z.string().email({
      message: t('validation:email_invalid', {
        defaultValue: 'Please enter a valid email address.',
      }),
    }),
    message: z.string().min(10, {
      message: t('validation:message_min', {
        defaultValue: 'Message must be at least {{count}} characters.',
        count: 10,
      }),
    }),
  })
}
```

### Usage in Component
```tsx
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createContactSchema, type ContactFormValues } from './schemas/contact'

function RouteComponent() {
  const { t } = useTranslation(['validation'])
  const schema = createContactSchema(t) // No useMemo needed

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: ContactFormValues) => {
    console.log(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <p>{errors.email.message}</p>}
      <button type="submit">Submit</button>
    </form>
  )
}
```

### Key Points

- ✅ **Factory Pattern**: Schema wrapped in a function that accepts `t`
- ✅ **No useMemo**: React Compiler handles optimization automatically
- ✅ **Type Safety**: Use `z.infer<ReturnType<typeof createSchema>>`
- ✅ **Interpolation**: Use `{{count}}` in validation messages
- ⚠️ **defaultValue Required**: Every `t()` call must have `defaultValue`

---

## 4. PLURALIZATION & CONTEXT

Use "Aggressive Suffixing" for Context + Plural combinations.

### Example
```tsx
import { useTranslation } from 'react-i18next'

type Gender = 'male' | 'female' | 'non_binary'

function SocialStatus({ count, gender }: { count: number; gender: Gender }) {
  const { t } = useTranslation(['social'])

  const statusText = t('social:relationship', {
    count,
    context: gender, // 'male', 'female', 'non_binary'

    // 1. Fallback / Neutral
    defaultValue: 'Just a friend',
    defaultValue_other: '{{count}} friends',

    // 2. Male Context
    defaultValue_male: 'He is a boyfriend',
    defaultValue_male_other: '{{count}} boyfriends',

    // 3. Female Context
    defaultValue_female: 'She is a girlfriend',
    defaultValue_female_other: '{{count}} girlfriends',
  })

  return <p>{statusText}</p>
}
```

### Generated JSON
```json
{
  "relationship": "Just a friend",
  "relationship_other": "{{count}} friends",
  "relationship_male": "He is a boyfriend",
  "relationship_male_other": "{{count}} boyfriends",
  "relationship_female": "She is a girlfriend",
  "relationship_female_other": "{{count}} girlfriends"
}
```

### Resolution Logic

i18next resolves translations in this order:

1. `key_context_plural` → `relationship_male_other`
2. `key_context` → `relationship_male`
3. `key_plural` → `relationship_other`
4. `key` → `relationship`

### Key Points

- ✅ Use `count` parameter for pluralization
- ✅ Use `context` parameter for variations (gender, role, etc.)
- ✅ Combine both with suffix pattern: `defaultValue_[context]_[plural]`
- ✅ `{{count}}` interpolates the number
- 🎯 Tool automatically generates all suffixed keys in JSON

---

## 5. RICH TEXT (`<Trans>`)

Use `<Trans>` when you need to include links, bold text, or other React components inside translations.

### Example with Links
```tsx
import { Trans } from 'react-i18next'
import { Link } from '@tanstack/react-router'

function TermsCheckbox() {
  return (
    <label>
      <input type="checkbox" required />
      <Trans
        i18nKey="auth:terms_consent"
        defaults="I agree to the <terms>Terms of Service</terms> and <privacy>Privacy Policy</privacy>."
        components={{
          terms: <Link to="/terms" className="underline text-blue-600" />,
          privacy: <Link to="/privacy" className="underline text-blue-600" />,
        }}
      />
    </label>
  )
}
```

### Example with Bold Text
```tsx
function WelcomeMessage({ username }: { username: string }) {
  return (
    <p>
      <Trans
        i18nKey="common:welcome_message"
        defaults="Welcome back, <bold>{{username}}</bold>! You have new notifications."
        values={{ username }}
        components={{
          bold: <strong className="font-bold" />,
        }}
      />
    </p>
  )
}
```

### Generated JSON
```json
{
  "terms_consent": "I agree to the <terms>Terms of Service</terms> and <privacy>Privacy Policy</privacy>.",
  "welcome_message": "Welcome back, <bold>{{username}}</bold>! You have new notifications."
}
```

### Key Points

- ✅ Use `<Trans>` for text containing HTML or React components
- ✅ `defaults` prop contains the text template with placeholders
- ✅ `components` prop maps placeholders to actual components
- ✅ Supports interpolation with `values` prop
- ⚠️ Placeholder names must match between `defaults` and `components`

---

## 6. TECH STACK SPECIFICS

- **Runtime:** Bun
- **Styling:** Tailwind CSS v4
- **State:** Zustand (store) / TanStack Query (server state)
- **Router:** TanStack Start / React Router
- **Forms:** React Hook Form + Zod v4
- **React:** React 19 + React Compiler

---

## 7. COMMANDS

| Command                  | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| `bun run i18n:extract`   | Scans code & updates JSON (Run after adding new keys) |
| `bun run i18n:status`    | Checks for missing translations                       |
| `bun run i18n:clean`     | Removes unused keys (Use with caution)                |

---

## 8. BEST PRACTICES

### DO ✅

- Always provide `defaultValue` in every `t()` call
- Use `returnObjects: true` for arrays and objects
- Use factory pattern for Zod schemas
- Use getter functions (starting with `get`) for static data
- Use `<Trans>` for text with HTML/components
- Let React Compiler handle optimization
- Use TypeScript interfaces for type safety

### DON'T ❌

- Never manually edit JSON files
- Never use `useMemo` or `useCallback` with schemas or getters
- Never omit `defaultValue`
- Never omit namespace in `t()` calls
- Never manually write arrays/objects in JSON

---

## 9. COMMON PATTERNS SUMMARY

| Pattern              | Use Case                            | Key Feature           |
| -------------------- | ----------------------------------- | --------------------- |
| `t()` function       | Simple text translations            | `defaultValue` prop   |
| Getter functions     | Arrays/objects (nav, pricing, etc.) | `returnObjects: true` |
| Factory pattern      | Zod schemas with translations       | Function wrapper      |
| Pluralization        | Count-based variations              | `count` parameter     |
| Context              | Role/gender-based variations        | `context` parameter   |
| `<Trans>` component  | Text with HTML/components           | `components` prop     |
