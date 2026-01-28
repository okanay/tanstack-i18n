# TanStack Start - SEO-First i18n Starter

A production-ready starter template for [TanStack Start](https://tanstack.com/start) featuring **SEO-optimized localized URLs**, proper **URL rewriting**, and complete **international SEO** support.

Built with **React 19**, **Tailwind CSS v4**, and **TanStack Router**. Pre-configured for **Cloudflare Workers** (easily adaptable to Vercel, Node.js, or other runtimes).

---

## The Problem This Template Solves

When building multilingual websites with TanStack Router, you face a frustrating limitation:

### The Origin URL Problem

With standard file-based routing, your default language **cannot use the origin URL**. You're forced into patterns like:

```
❌ Standard Approach (Origin URL Wasted)
├── site.com/en          ← English home (origin unusable)
├── site.com/en/about    ← English about
├── site.com/tr          ← Turkish home
└── site.com/tr/hakkinda ← Turkish about

What about site.com/ ? → Returns 404 or requires redirect
```

This wastes your most valuable URL (`site.com/`) and creates unnecessary redirects that hurt SEO.

### What You Actually Want

```
✅ This Template's Approach (Origin URL Used)
├── site.com/            ← English home (origin utilized!)
├── site.com/about       ← English about
├── site.com/tr          ← Turkish home
└── site.com/tr/hakkinda ← Turkish about
```

The default language (English) uses clean origin URLs while other languages get prefixed paths. **No wasted URLs, no redirects, perfect SEO.**

### The Localized URL Problem

Even if you solve the origin issue, you still face another challenge: **localized slugs**.

For proper international SEO, URLs should be translated:

```
❌ Same slugs for all languages (Bad for SEO)
├── site.com/about
├── site.com/tr/about      ← "about" means nothing in Turkish
└── site.com/fr/about      ← "about" means nothing in French

✅ Localized slugs (Good for SEO)
├── site.com/about
├── site.com/tr/hakkimizda ← "hakkımızda" = "about us" in Turkish
└── site.com/fr/a-propos   ← "à propos" = "about" in French
```

But localized slugs create a new problem: **How do you maintain one codebase when URLs are different per language?**

---

## The Solution: URL Rewriting

This template uses TanStack Router's `rewrite` API to decouple **what users see** from **what your code handles**.

### How It Works

```
User visits: site.com/tr/hakkimizda
                    ↓
        ┌─────────────────────┐
        │   ROUTER MATCHES    │
        │ routes/{-$locale}/  │
        │     about.tsx       │
        └─────────────────────┘
                    ↓
        ┌─────────────────────┐
        │   OUTPUT REWRITE    │
        │ /tr/about           │
        │       ↓             │
        │ /tr/hakkimizda      │
        └─────────────────────┘
                    ↓
Browser displays: site.com/tr/hakkimizda
```

**One route file (`about.tsx`) serves all languages.** No duplication.

### Direct URL Access

When someone bookmarks `site.com/tr/hakkimizda` or shares it on social media, it works immediately:

- ✅ No redirects
- ✅ No 404 errors
- ✅ No flash of wrong content
- ✅ Correct language loads instantly

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.0+ (package manager and script runtime)
- Node.js 18+ (for Vite compatibility)

### Installation

```bash
git clone https://github.com/okanay/tanstack-start-i18n.git
cd tanstack-start-i18n
bun install
bun run dev
```

Visit `http://localhost:3000` to see the app.

---

## Configuration

### 1. Define Your Languages

```typescript
// src/i18n/config.ts
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
```

### 2. Define Localized Routes

```typescript
// src/i18n/data/routes.ts
export const LOCALIZED_ROUTES = {
  en: {
    '/': '/',
    '/about': '/about',
    '/contact': '/contact',
    '/products': '/products',
    '/products/search': '/products/search',
    '/products/$slug': '/products/$slug',
    '/products/$slug/payment': '/products/$slug/payment',
  },
  tr: {
    '/': '/tr',
    '/about': '/hakkimizda',
    '/contact': '/iletisim',
    '/products': '/urunler',
    '/products/search': '/urunler/arama',
    '/products/$slug': '/urunler/$slug',
    '/products/$slug/payment': '/urunler/$slug/odeme',
  },
  fr: {
    '/': '/fr',
    '/about': '/environ',
    '/contact': '/nous-contacter',
    '/products': '/produits',
    '/products/search': '/produits/recherche',
    '/products/$slug': '/produits/$slug',
    '/products/$slug/payment': '/produits/$slug/paiement',
  },
} as const satisfies Record<LanguageValue, Record<string, string>>
```

Dynamic segments (`$slug`, `$id`, etc.) are automatically preserved during URL rewriting.

### 3. Define SEO Metadata

```typescript
// src/i18n/data/seo.ts
export const SEO = {
  en: {
    '/': {
      title: 'Home | My Site',
      description: 'Welcome to our website.',
      og: { title: 'My Site', description: 'Welcome to our website' },
    },
    '/about': {
      title: 'About Us | My Site',
      description: 'Learn more about our company.',
      og: { title: 'About Us', description: 'Learn about our company' },
    },
  },
  tr: {
    '/': {
      title: 'Ana Sayfa | Sitem',
      description: 'Web sitemize hoş geldiniz.',
      og: { title: 'Sitem', description: 'Web sitemize hoş geldiniz' },
    },
    '/about': {
      title: 'Hakkımızda | Sitem',
      description: 'Şirketimiz hakkında bilgi edinin.',
      og: { title: 'Hakkımızda', description: 'Şirketimiz hakkında' },
    },
  },
  // ... fr
}
```

---

## SEO Features

### Automatic Canonical & Hreflang Tags

Every page automatically generates proper SEO tags:

```typescript
// In any route file
export const Route = createFileRoute('/{-$locale}/about')({
  head: ({ params }) => ({
    meta: getSeoMetadata('/about', params.locale),
    links: getCanonicalLinks('/about', params.locale),
  }),
  component: AboutPage,
})
```

**Generated HTML output:**

```html
<!-- Canonical -->
<link rel="canonical" href="https://site.com/tr/hakkimizda" />

<!-- Hreflang alternatives -->
<link rel="alternate" hreflang="en" href="https://site.com/about" />
<link rel="alternate" hreflang="tr" href="https://site.com/tr/hakkimizda" />
<link rel="alternate" hreflang="fr" href="https://site.com/fr/a-propos" />
<link rel="alternate" hreflang="x-default" href="https://site.com/about" />
```

### Dynamic Sitemap Generation

The template includes a dynamic `sitemap.xml` route that automatically generates entries for all pages in all languages:

```xml
<!-- GET /sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://site.com/</loc>
    <lastmod>2025-01-28</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://site.com/tr</loc>
    <lastmod>2025-01-28</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- ... all routes × all languages -->
</urlset>
```

---

## Using Translations

This template uses `react-i18next` for translations:

```tsx
// src/routes/{-$locale}/about.tsx
import { useTranslation } from 'react-i18next'

function AboutPage() {
  const { t } = useTranslation(['about'])

  return (
    <div>
      <h1>{t('about:page_title', { defaultValue: 'About Us' })}</h1>
      <p>{t('about:description', { defaultValue: 'Learn more about our company.' })}</p>
    </div>
  )
}
```

Translation files are located in `src/messages/{lang}/`:

```
src/messages/
├── en/
│   ├── about.json
│   ├── home.json
│   └── index.ts
├── tr/
│   ├── about.json
│   ├── home.json
│   └── index.ts
└── fr/
    └── ...
```

---

## Language Switching

The template includes a ready-to-use language switcher:

```tsx
import { useLanguage } from '@/i18n/provider'

function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <div>
      <button onClick={() => setLanguage('en')}>English</button>
      <button onClick={() => setLanguage('tr')}>Türkçe</button>
      <button onClick={() => setLanguage('fr')}>Français</button>
    </div>
  )
}
```

When switching languages, the URL is automatically rewritten:

```
Current: site.com/tr/hakkimizda
Click "English"
Result:  site.com/about  ← Same page, different language, correct URL
```

---

## Project Structure

```
├── src/
│   ├── i18n/
│   │   ├── config.ts        # Language definitions
│   │   ├── rewrite.ts       # URL rewriting logic
│   │   ├── provider.tsx     # React context
│   │   ├── data/
│   │   │   ├── routes.ts    # Localized URL mappings
│   │   │   └── seo.ts       # SEO metadata per route
│   │   └── utils/
│   │       ├── canonical.ts # Canonical/hreflang generator
│   │       └── seo.ts       # Meta tag utilities
│   │
│   ├── messages/            # Translation JSON files
│   │   ├── en/
│   │   ├── tr/
│   │   └── fr/
│   │
│   ├── routes/
│   │   ├── __root.tsx       # Root layout with i18n
│   │   ├── sitemap[.]xml.ts # Dynamic sitemap
│   │   └── {-$locale}/      # All localized routes
│   │       ├── route.tsx    # Locale validation
│   │       ├── index.tsx
│   │       ├── about.tsx
│   │       └── ...
│   │
│   └── router.tsx           # Router with rewrite config
│
└── i18n/                    # [Bonus] Extraction scripts
```

---

## Deployment

### Cloudflare Workers (Default)

```bash
bun run deploy
```

### Other Platforms

Modify `vite.config.ts` to use a different adapter:

```typescript
// For Vercel
import { vercel } from '@tanstack/react-start/adapters/vercel'

// For Node.js
import { node } from '@tanstack/react-start/adapters/node'
```

---

## Bonus: Code-First Translation Extraction

This template includes an optional AST-based extraction tool that scans your code and generates translation JSON files automatically.

Instead of manually maintaining JSON files, you write translations inline:

```tsx
t('home:welcome', { defaultValue: 'Welcome, {{name}}!', name: user.name })
```

Then run:

```bash
bun run i18n:extract
```

The tool scans all `.tsx` files, extracts keys with `defaultValue`, and generates/updates `messages/en/*.json` automatically.

### Available Scripts

| Script | Description |
|--------|-------------|
| `bun run i18n:extract` | Extract keys from code → JSON |
| `bun run i18n:clean` | Remove unused keys from JSON |
| `bun run i18n:status` | Show translation progress |

### Vite Dev Shortcuts

During development, press these keys in the terminal:

| Key | Action |
|-----|--------|
| `t` | Extract translations |
| `s` | Show translation status |
| `x` | Clean unused keys |

**Note:** This extraction system is completely optional. You can manually manage your JSON files if you prefer.

---

## Tech Stack

- **React 19** with React Compiler
- **TanStack Start** for full-stack React
- **TanStack Router** with type-safe file routing
- **TanStack Query** for server state
- **react-i18next** for translations
- **Tailwind CSS v4** with Vite plugin
- **Bun** as package manager
- **Cloudflare Workers** for edge deployment

---

## License

MIT

---

## Author

[Okan Ay](https://github.com/okanay)
