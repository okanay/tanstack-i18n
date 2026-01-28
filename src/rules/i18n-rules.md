# i18n Development Rules

## Context

This project uses a **code-first i18n extraction system** with AST analysis.
The English source text lives in code via `defaultValue`. The extraction script (`bun run i18n:extract`) generates JSON files automatically.

**Tech Stack:** React, TypeScript, react-i18next, Zod v4, React Compiler (no useMemo/useCallback)

---

## Absolute Rules

1. **NEVER** manually edit `messages/en/*.json` files. They are auto-generated.
2. **ALWAYS** include `defaultValue` in every `t()` call for new keys.
3. **ALWAYS** use the factory pattern for Zod schemas with i18n.
4. **NEVER** use `useMemo` or `useCallback` (React Compiler handles optimization).

---

## Patterns

### Simple Translation

```tsx
// CORRECT
{
  t('home:hero.title', { defaultValue: 'Welcome to Our Platform' })
}

// INCORRECT - missing defaultValue
{
  t('home:hero.title')
}
```

### Interpolation

Use `{{variable}}` syntax for dynamic values.

```tsx
// CORRECT
{
  t('home:greeting', {
    defaultValue: 'Hello {{name}}, welcome back!',
    name: user.name,
  })
}

// INCORRECT - wrong bracket syntax
{
  t('home:greeting', {
    defaultValue: 'Hello {name}, welcome back!', // single braces
    name: user.name,
  })
}
```

### Rich Text with Components

Use `<Trans>` for JSX interpolation.

```tsx
// CORRECT
import { Trans } from "react-i18next";

<Trans
  i18nKey="auth:accept_terms"
  defaults="I accept the <termsLink>Terms</termsLink> and <privacyLink>Privacy Policy</privacyLink>."
  components={{
    termsLink: <a href="/terms" className="underline" />,
    privacyLink: <a href="/privacy" className="underline" />,
  }}
/>

// INCORRECT - string concatenation
{t("auth:accept_terms_1")} <a href="/terms">Terms</a> {t("auth:accept_terms_2")}
```

### Arrays and Objects

Enable `returnObjects: true`. File-level constants are resolved during extraction.

```tsx
// CORRECT
const BRAND = 'MySuperApp'

const features = t('home:features.list', {
  returnObjects: true,
  defaultValue: [
    { title: 'Fast Performance', desc: 'Optimized for speed.' },
    { title: 'Brand Integration', desc: BRAND },
  ],
})

// INCORRECT - returnObjects missing
const features = t('home:features.list', {
  defaultValue: [{ title: 'Fast' }], // won't work without returnObjects
})
```

### Zod Schema (Factory Pattern)

Since React Compiler is active, do not wrap with `useMemo`. Use a ref-based equality check or rely on React Compiler's automatic optimization.

```tsx
// schema.ts
import { z } from 'zod'
import type { TFunction } from 'i18next'

export const createLoginSchema = (t: TFunction<'auth'>) =>
  z.object({
    email: z.string().email({
      message: t('validation.email_invalid', {
        defaultValue: 'Please enter a valid email address.',
      }),
    }),
    password: z.string().min(8, {
      message: t('validation.password_min', {
        defaultValue: 'Password must be at least {{count}} characters.',
        count: 8,
      }),
    }),
  })
```

```tsx
// component.tsx
import { useTranslation } from 'react-i18next'
import { createLoginSchema } from './schema'

export function LoginForm() {
  const { t } = useTranslation(['auth'])

  // React Compiler handles memoization automatically
  const schema = createLoginSchema(t)

  // use with react-hook-form...
}
```

---

## Naming Convention

Pattern: `namespace:context.key_name`

| Example                 | File          | JSON Structure                         |
| ----------------------- | ------------- | -------------------------------------- |
| `auth:login.submit_btn` | `auth.json`   | `{ "login": { "submit_btn": "..." } }` |
| `common:actions.cancel` | `common.json` | `{ "actions": { "cancel": "..." } }`   |
| `home:hero.title`       | `home.json`   | `{ "hero": { "title": "..." } }`       |

**Rules:**

- Namespace = filename (without `.json`)
- Use `:` after namespace
- Use `.` for nested keys
- Use `snake_case` for key names

---

## Edge Cases

### Context && Pluralization

```tsx
// CORRECT
const countValue = 10
const genderValue = 'female'

const gender = t('context:relationship', {
  count: countValue,
  context: genderValue,
  // 1. Nötr
  defaultValue: 'A Friend',
  defaultValue_other: '{{count}} friends',

  // 2. Erkek
  defaultValue_male: 'A boyfriend',
  defaultValue_male_other: '{{count}} boyfriends',

  // 3. Kadın
  defaultValue_female: 'A girlfriend',
  defaultValue_female_other: '{{count}} girlfriends',
})
```

### Conditional Text

```tsx
// CORRECT - separate keys
{
  isLoggedIn ? t('header:greeting_user', { defaultValue: 'Welcome back!' }) : t('header:greeting_guest', { defaultValue: 'Hello, guest!' })
}

// INCORRECT - logic inside defaultValue
{
  t('header:greeting', {
    defaultValue: isLoggedIn ? 'Welcome back!' : 'Hello, guest!', // extraction will fail
  })
}
```

### Dynamic Namespace Loading

```tsx
// CORRECT
const { t } = useTranslation(['common', 'auth'])

// Access both namespaces
{
  t('common:actions.save', { defaultValue: 'Save' })
}
{
  t('auth:login.title', { defaultValue: 'Sign In' })
}
```

---

## Quick Reference

| Scenario       | Solution                                             |
| -------------- | ---------------------------------------------------- |
| Simple text    | `t("ns:key", { defaultValue: "Text" })`              |
| Variable       | `defaultValue: "Hello {{name}}"` + `name: value`     |
| JSX/HTML       | `<Trans>` component with `components` prop           |
| Array/Object   | Add `returnObjects: true`                            |
| Zod validation | Factory function: `createSchema(t: TFunction<"ns">)` |
| Plural         | `defaultValue` + `defaultValue_plural` + `count`     |

---

## Extraction Command

```bash
bun run i18n:extract
```

This command:

1. Scans all `.tsx` and `.ts` files
2. Extracts `t()` calls and `<Trans>` components
3. Resolves file-level constants in `defaultValue`
4. Overwrites `messages/en/*.json`
5. Syncs keys to other language files (`tr`, `fr`, etc.)
