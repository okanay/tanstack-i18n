# Static Lists with Getter Pattern

This example shows how to create type-safe, translatable static lists using the getter pattern.

## Type Definitions
```typescript
import type { TFunction } from 'i18next'

// Type definitions (usually from types.ts, but here for example)
export interface FooterItem {
  title: string
  href: string
}

export interface FeatureItem {
  title: string
  description: string
  icon: string
}
```

## Footer Links Example

Simple list of navigation items:
```typescript
/**
 * Example for static lists like a Footer.
 * Uses the 'footer' namespace.
 */
export const getFooterLinks = (t: TFunction<'footer'>): FooterItem[] => {
  return t('layout.links', {
    returnObjects: true, // ⚠️ REQUIRED for arrays/objects
    defaultValue: [
      { title: 'About Us', href: '/about' },
      { title: 'Contact', href: '/contact' },
      { title: 'Privacy Policy', href: '/privacy' },
      { title: 'Terms of Service', href: '/terms' },
    ],
  }) as FooterItem[]
}
```

## Features Example with Constants

Nested objects with external constants:
```typescript
/**
 * Example of nested object structures and using an external constant.
 * The tool will resolve the 'BRAND_NAME' constant and write 'SuperApp' to the JSON.
 */
const BRAND_NAME = 'SuperApp'

export const getFeatures = (t: TFunction<'landing'>): FeatureItem[] => {
  return t('hero.features', {
    returnObjects: true,
    defaultValue: [
      {
        title: 'High Performance',
        description: 'Built with React 19 and compiled for speed.',
        icon: 'lightning',
      },
      {
        title: 'Secure by Default',
        description: `Your data is safe with ${BRAND_NAME}.`, // Template literal works!
        icon: 'shield',
      },
    ],
  }) as FeatureItem[]
}
```

## Usage in Components
```typescript
const { t } = useTranslation(['footer'])
const links = getFooterLinks(t)

// Render
{links.map((link) => (
  <a key={link.href} href={link.href}>
    {link.title}
  </a>
))}
```

## Key Points

- ✅ `returnObjects: true` is MANDATORY
- ✅ Type-safe with interfaces
- ✅ Template literals and constants are resolved
- ✅ Function names typically start with `get`
- ❌ Never manually edit JSON arrays
