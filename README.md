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

site.com/         → 404 or redirect (unusable!)
site.com/en       → English home
site.com/en/about → English about
site.com/tr       → Turkish home
site.com/tr/about → Turkish about
```

Your most valuable URL (`site.com/`) goes to waste. Users hitting the root get a 404 or an unnecessary redirect.

**This template solves it:**

```
✅ This Template (Origin URL Utilized)

site.com/            → English home (origin works!)
site.com/about       → English about
site.com/tr          → Turkish home
site.com/tr/hakkinda → Turkish about
```

The default language uses clean origin URLs. Other languages get prefixed paths. No wasted URLs, no redirects.

### The Localized Slug Problem

For proper international SEO, URLs should be translated too:

```
❌ Same Slugs (Bad for SEO)

site.com/about       → English
site.com/tr/about    → Turkish (but "about" means nothing in Turkish!)
site.com/fr/about    → French (same problem)

✅ Localized Slugs (Good for SEO)

site.com/about       → English
site.com/tr/hakkimizda → Turkish ("hakkımızda" = "about us")
site.com/fr/a-propos   → French ("à propos" = "about")
```

But this creates a maintenance nightmare: Do you create separate route files for each language? How do you keep them in sync?

### The Link & Navigate Problem

Most i18n solutions require custom wrapper components:

```tsx
❌ Typical i18n Solutions

// Custom wrapper required
<LocalizedLink to="/about">About</LocalizedLink>

// Or manual path building
<Link to={`/${currentLang}/about`}>About</Link>

// Or helper functions everywhere
<Link to={getLocalizedPath('/about', lang)}>About</Link>
navigate(buildLocalizedUrl('/products', lang))
```

This pollutes your codebase. Every link, every navigation call needs special handling.

**This template solves it:**

```tsx
✅ This Template (Standard Components Work)

// Just use normal Link - rewriting handles the rest
<Link to="/{-$locale}/about">About</Link>

// Normal navigate - no wrappers needed
navigate({ to: '/{-$locale}/about' })

// Dynamic params work too
<Link to="/{-$locale}/products/$slug" params={{ slug: 'blue-shirt' }}>
  View Product
</Link>
```

The URL rewrite system intercepts all navigation automatically. Your code stays clean.

---

## The Solution: URL Rewriting

TanStack Router's `rewrite` API decouples **what users see** from **what your code handles**.

### The Core Concept

URL Rewriting works in two directions:

| Direction | When | What it does |
|-----------|------|--------------|
| **Input** | User visits a URL | Converts localized URL → internal route |
| **Output** | App renders a link | Converts internal route → localized URL |

### Example Flow

**User visits `site.com/tr/hakkimizda`:**

```
STEP 1: Input Rewrite
─────────────────────
Browser URL:     /tr/hakkimizda
                      ↓
Parse:           lang="tr", path="/hakkimizda"
                      ↓
Lookup:          /hakkimizda → /about (from routes.ts)
                      ↓
Internal URL:    /tr/about


STEP 2: Router Matches
─────────────────────
Internal URL:    /tr/about
                      ↓
Matches:         routes/{-$locale}/about.tsx
                      ↓
Renders:         AboutPage component


STEP 3: Output Rewrite
─────────────────────
Any <Link to="/{-$locale}/about"> in the page
                      ↓
Lookup:          /about → /hakkimizda (for Turkish)
                      ↓
Rendered HTML:   <a href="/tr/hakkimizda">
```

**Result:** User sees `/tr/hakkimizda` in the browser. Your code only knows `/about`. One route file serves all languages.

### Direct URL Access Works

When someone bookmarks `/tr/hakkimizda` or shares it on social media:

- ✅ No redirects needed
- ✅ No 404 errors
- ✅ No flash of wrong content
- ✅ Correct language loads instantly

---

## Quick Start

```bash
git clone https://github.com/okanay/tanstack-start-i18n.git
cd tanstack-start-i18n
bun install
bun run dev
```

Visit `http://localhost:3000`

---

## Configuration

### 1. Define Languages

```typescript
// src/i18n/config.ts
export const SUPPORTED_LANGUAGES = [
  {
    label: 'English',
    value: 'en',
    locale: 'en-US',
    direction: 'ltr',
    default: true,  // ← Uses origin URLs (no prefix)
  },
  {
    label: 'Türkçe',
    value: 'tr',
    locale: 'tr-TR',
    direction: 'ltr',
    default: false, // ← Uses /tr prefix
  },
  {
    label: 'Français',
    value: 'fr',
    locale: 'fr-FR',
    direction: 'ltr',
    default: false, // ← Uses /fr prefix
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
    '/products/$slug': '/products/$slug',
    '/products/$slug/payment': '/products/$slug/payment',
  },
  tr: {
    '/': '/tr',
    '/about': '/hakkimizda',
    '/contact': '/iletisim',
    '/products': '/urunler',
    '/products/$slug': '/urunler/$slug',
    '/products/$slug/payment': '/urunler/$slug/odeme',
  },
  fr: {
    '/': '/fr',
    '/about': '/a-propos',
    '/contact': '/nous-contacter',
    '/products': '/produits',
    '/products/$slug': '/produits/$slug',
    '/products/$slug/payment': '/produits/$slug/paiement',
  },
} as const
```

Dynamic segments (`$slug`, `$id`) are preserved automatically during rewriting.

### 3. Define SEO Metadata

```typescript
// src/i18n/data/seo.ts
export const SEO = {
  en: {
    '/': {
      title: 'Home | My Site',
      description: 'Welcome to our website.',
      og: { title: 'My Site', description: 'Welcome' },
    },
    '/about': {
      title: 'About Us | My Site',
      description: 'Learn more about our company.',
      og: { title: 'About Us', description: 'Our story' },
    },
  },
  tr: {
    '/': {
      title: 'Ana Sayfa | Sitem',
      description: 'Web sitemize hoş geldiniz.',
      og: { title: 'Sitem', description: 'Hoş geldiniz' },
    },
    '/about': {
      title: 'Hakkımızda | Sitem',
      description: 'Şirketimiz hakkında.',
      og: { title: 'Hakkımızda', description: 'Hikayemiz' },
    },
  },
  // ... fr
}
```

---

## Navigation

### Using Link

```tsx
import { Link } from '@tanstack/react-router'

// Basic link - rewriting handles localization
<Link to="/{-$locale}/about">About Us</Link>

// With dynamic params
<Link
  to="/{-$locale}/products/$slug"
  params={{ slug: 'blue-shirt' }}
>
  View Product
</Link>

// With search params
<Link
  to="/{-$locale}/products"
  search={{ category: 'shirts', sort: 'price' }}
>
  Shirts
</Link>
```

**What users see:**

| Current Language | Link Output |
|------------------|-------------|
| English | `/about`, `/products/blue-shirt` |
| Turkish | `/tr/hakkimizda`, `/tr/urunler/blue-shirt` |
| French | `/fr/a-propos`, `/fr/produits/blue-shirt` |

### Using Navigate

```tsx
import { useNavigate } from '@tanstack/react-router'

function MyComponent() {
  const navigate = useNavigate()

  const goToAbout = () => {
    navigate({ to: '/{-$locale}/about' })
  }

  const goToProduct = (slug: string) => {
    navigate({
      to: '/{-$locale}/products/$slug',
      params: { slug }
    })
  }

  const goToProductsWithFilter = () => {
    navigate({
      to: '/{-$locale}/products',
      search: { category: 'shirts' }
    })
  }
}
```

### Language Switching

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

When switching, the URL transforms automatically:

```
Current:  /tr/urunler/blue-shirt
Switch to English
Result:   /products/blue-shirt
```

---

## SEO Features

### Automatic Canonical & Hreflang

Every route automatically generates proper SEO tags:

```typescript
// src/routes/{-$locale}/about.tsx
export const Route = createFileRoute('/{-$locale}/about')({
  head: ({ params }) => ({
    meta: getSeoMetadata('/about', params.locale),
    links: getCanonicalLinks('/about', params.locale),
  }),
  component: AboutPage,
})
```

**Generated HTML:**

```html
<!-- Canonical (current page) -->
<link rel="canonical" href="https://site.com/tr/hakkimizda" />

<!-- Language alternatives -->
<link rel="alternate" hreflang="en" href="https://site.com/about" />
<link rel="alternate" hreflang="tr" href="https://site.com/tr/hakkimizda" />
<link rel="alternate" hreflang="fr" href="https://site.com/fr/a-propos" />
<link rel="alternate" hreflang="x-default" href="https://site.com/about" />
```

### Dynamic Sitemap

Server-rendered sitemap at `/sitemap.xml`:

```typescript
// src/routes/sitemap[.]xml.ts
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const entries = [
          // All localized URLs
          { loc: `${BASE_URL}/`, priority: 1.0 },
          { loc: `${BASE_URL}/tr`, priority: 1.0 },
          { loc: `${BASE_URL}/about`, priority: 0.8 },
          { loc: `${BASE_URL}/tr/hakkimizda`, priority: 0.8 },
          // ...
        ]

        return new Response(generateSitemapXml(entries), {
          headers: { 'Content-Type': 'application/xml' },
        })
      },
    },
  },
})
```

The sitemap uses **localized URLs** (what search engines should index).

---

## Using Translations

```tsx
import { useTranslation } from 'react-i18next'

function AboutPage() {
  const { t } = useTranslation(['about'])

  return (
    <div>
      <h1>{t('about:page_title', { defaultValue: 'About Us' })}</h1>

      {/* With interpolation */}
      <p>{t('about:greeting', {
        defaultValue: 'Hello {{name}}',
        name: 'John'
      })}</p>
    </div>
  )
}
```

Translation files in `src/messages/{lang}/`:

```
src/messages/
├── en/
│   ├── about.json    {"page_title": "About Us", ...}
│   ├── home.json
│   └── index.ts
├── tr/
│   ├── about.json    {"page_title": "Hakkımızda", ...}
│   └── ...
└── fr/
    └── ...
```

---

## Project Structure

```
├── src/
│   ├── i18n/
│   │   ├── config.ts        # Language definitions
│   │   ├── rewrite.ts       # URL rewriting logic
│   │   ├── provider.tsx     # React context & hooks
│   │   ├── instance.ts      # i18next setup
│   │   ├── loader.ts        # Dynamic resource loading
│   │   ├── data/
│   │   │   ├── routes.ts    # Localized URL mappings
│   │   │   └── seo.ts       # Per-route SEO metadata
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
│   │   ├── __root.tsx       # Root layout (i18n init)
│   │   ├── sitemap[.]xml.ts # Dynamic sitemap
│   │   └── {-$locale}/      # All localized routes
│   │       ├── route.tsx    # Locale validation layout
│   │       ├── index.tsx    # Home page
│   │       ├── about.tsx    # About page
│   │       ├── contact.tsx  # Contact page
│   │       └── products.*.tsx
│   │
│   └── router.tsx           # Router config with rewrite
│
├── i18n/                    # [Bonus] Extraction tool
│   ├── extract.ts
│   ├── clean.ts
│   └── status.ts
│
└── vite.config.ts
```

---

## Bonus: Code-First Translation Extraction

This template includes an optional AST-based tool that generates translation JSON files from your code.

Instead of manually editing JSON:

```tsx
// Write this in your component
t('home:welcome', { defaultValue: 'Welcome, {{name}}!', name: user.name })
```

Run extraction:

```bash
bun run i18n:extract
```

The tool scans your codebase and generates `messages/en/home.json` automatically.

### Scripts

| Command | Description |
|---------|-------------|
| `bun run i18n:extract` | Extract keys from code → generate JSON |
| `bun run i18n:clean` | Remove unused keys from JSON files |
| `bun run i18n:status` | Show translation progress per language |

### Dev Server Shortcuts

Press these keys in terminal during `bun run dev`:

| Key | Action |
|-----|--------|
| `t` | Extract translations |
| `s` | Show status |
| `x` | Clean unused keys |

This tool is **completely optional**. You can manually manage JSON files if preferred.

---

## Tech Stack

- **React 19** with React Compiler
- **TanStack Start** - Full-stack React framework
- **TanStack Router** - Type-safe routing with URL rewriting
- **TanStack Query** - Server state management
- **react-i18next** - Translation runtime
- **Tailwind CSS v4** - Styling
- **Bun** - Package manager & runtime
- **Cloudflare Workers** - Edge deployment

---

## License

MIT

---

## Author

[Okan Ay](https://github.com/okanay)
