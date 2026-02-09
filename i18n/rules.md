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

## 2. STATIC DATA & LISTS (The "Getter" Pattern)

For static lists (navbars, footers, features), do NOT define arrays in JSON manually. Use a strongly-typed getter function with `returnObjects: true`.

### Pattern:
```typescript
import type { TFunction } from 'i18next'

export interface FooterItem {
  title: string
  href: string
}

// Function name usually starts with "get"
export const getFooterLinks = (t: TFunction<'footer'>): FooterItem[] => {
  return t('layout.links', {
    returnObjects: true, // REQUIRED for arrays/objects
    defaultValue: [
      { title: 'About Us', href: '/about' },
      { title: 'Contact', href: '/contact' },
      { title: 'Privacy', href: '/privacy' },
    ],
  }) as FooterItem[]
}
```

### Usage:
```typescript
const { t } = useTranslation(['footer'])
const links = getFooterLinks(t)
```

---

## 3. ZOD VALIDATION (Factory Pattern)

Since schemas need the `t` function for error messages, wrap them in a factory function. Rely on React Compiler for optimization (No `useMemo`).

### Pattern:
```typescript
import { z } from 'zod'
import type { TFunction } from 'i18next'

export const createLoginSchema = (t: TFunction<'auth'>) => {
  return z.object({
    email: z.string().email({
      message: t('validation.email_invalid', {
        defaultValue: 'Please enter a valid email address.'
      })
    }),
    password: z.string().min(8, {
      message: t('validation.password_min', {
        defaultValue: 'Must be at least {{count}} characters.',
        count: 8
      })
    })
  })
}
```

### Usage in Component:
```typescript
const { t } = useTranslation(['auth'])
const loginSchema = createLoginSchema(t)
```

---

## 4. ADVANCED PLURALIZATION & CONTEXT

Our tool uses "Aggressive Suffixing". It captures ANY property starting with `defaultValue_` and appends the suffix to the key in the JSON.

Use this for Context + Plural combinations:
```typescript
t('social:relationship', {
  count: countValue,
  context: genderValue, // 'male', 'female', etc.

  // 1. Fallback / Neutral
  defaultValue: 'Just a friend',
  defaultValue_other: '{{count}} friends',

  // 2. Male Context
  defaultValue_male: 'He is a boyfriend',
  defaultValue_male_other: '{{count}} boyfriends',

  // 3. Female Context
  defaultValue_female: 'She is a girlfriend',
  defaultValue_female_other: '{{count}} girlfriends'
})
```

---

## 5. RICH TEXT (`<Trans>`)

Use the `<Trans>` component for text containing HTML or components.
```typescript
<Trans
  i18nKey="auth:terms_consent"
  defaults="I agree to the <terms>Terms</terms> and <privacy>Privacy Policy</privacy>."
  components={{
    terms: <Link to="/terms" className="underline" />,
    privacy: <Link to="/privacy" className="underline" />
  }}
/>
```

---

## 6. TECH STACK SPECIFICS

- **Runtime:** Bun
- **Styling:** Tailwind CSS v4
- **State:** Zustand (store) / TanStack Query (server state)
- **Router:** TanStack Start / React Router
- **Forms:** React Hook Form + Zod v4

---

## 7. COMMANDS

| Command | Description |
|---------|-------------|
| `bun run i18n:extract` | Scans code & updates JSON (Run this after adding new keys) |
| `bun run i18n:status` | Checks for missing translations |
| `bun run i18n:clean` | Removes unused keys (Use with caution) |

---

## KEY IMPROVEMENTS IN THIS DOCUMENT

1. **"Getter Pattern" (Static Lists):** Clear example with `getFooterLinks`, mandatory `returnObjects: true`, and type definitions. AI won't try to manually write arrays in JSON.

2. **Factory Pattern (Zod):** Emphasizes React Compiler usage, forbids `useMemo`, and shows how to wrap schemas in functions.

3. **Aggressive Suffixing:** Most complex scenario (Gender + Count) provided so simpler cases are automatically covered.

4. **Strict Prohibitions:** Explicitly states that without `defaultValue`, the Extraction Tool will ignore the key.
