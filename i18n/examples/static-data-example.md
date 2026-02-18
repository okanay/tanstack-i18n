# Static Data with returnObjects Pattern

This example shows how to export **arrays** and **objects** using `returnObjects: true`.

## Type Definitions
```typescript
import type { TFunction } from 'i18next'

// Navigation Item
export interface NavItem {
  label: string
  href: string
  icon?: string
}

// Pricing Plan
export interface PricingPlan {
  name: string
  price: number
  features: string[]
  popular?: boolean
}

// FAQ Item
export interface FAQItem {
  question: string
  answer: string
}

// Site Configuration
export interface SiteConfig {
  name: string
  description: string
  email: string
  socialLinks: {
    twitter: string
    github: string
  }
}
```

---

## Example 1: Simple Array (Navigation)
```typescript
export const getMainNavigation = (t: TFunction<'navigation'>): NavItem[] => {
  return t('main_menu', {
    returnObjects: true, // ⚠️ REQUIRED
    defaultValue: [
      { label: 'Home', href: '/', icon: 'home' },
      { label: 'Products', href: '/products', icon: 'package' },
      { label: 'Pricing', href: '/pricing', icon: 'credit-card' },
      { label: 'Contact', href: '/contact', icon: 'mail' },
    ],
  }) as NavItem[]
}
```

### Usage
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

### Generated JSON
```json
{
  "main_menu": [
    { "label": "Home", "href": "/", "icon": "home" },
    { "label": "Products", "href": "/products", "icon": "package" },
    { "label": "Pricing", "href": "/pricing", "icon": "credit-card" },
    { "label": "Contact", "href": "/contact", "icon": "mail" }
  ]
}
```

---

## Example 2: Nested Array (Pricing Plans)
```typescript
const CURRENCY = 'USD'

export const getPricingPlans = (t: TFunction<'pricing'>): PricingPlan[] => {
  return t('plans', {
    returnObjects: true,
    defaultValue: [
      {
        name: 'Starter',
        price: 9,
        features: ['5 Projects', '10GB Storage', 'Email Support'],
        popular: false,
      },
      {
        name: 'Pro',
        price: 29,
        features: ['Unlimited Projects', '100GB Storage', 'Priority Support', 'Advanced Analytics'],
        popular: true,
      },
      {
        name: 'Enterprise',
        price: 99,
        features: ['Everything in Pro', 'Dedicated Manager', 'Custom Integration', `Billed in ${CURRENCY}`],
        popular: false,
      },
    ],
  }) as PricingPlan[]
}
```

### Usage
```tsx
function PricingSection() {
  const { t } = useTranslation(['pricing'])
  const plans = getPricingPlans(t)

  return (
    <div className="grid grid-cols-3 gap-4">
      {plans.map((plan) => (
        <div key={plan.name} className="rounded border p-6">
          <h3 className="text-xl font-bold">{plan.name}</h3>
          <p className="text-3xl">${plan.price}</p>
          <ul>
            {plan.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          {plan.popular && <span className="badge">Popular</span>}
        </div>
      ))}
    </div>
  )
}
```

---

## Example 3: Single Object (Site Config)
```typescript
const SUPPORT_EMAIL = 'support@example.com'

export const getSiteConfig = (t: TFunction<'common'>): SiteConfig => {
  return t('site_config', {
    returnObjects: true,
    defaultValue: {
      name: 'My Awesome App',
      description: 'The best platform for managing your projects.',
      email: SUPPORT_EMAIL,
      socialLinks: {
        twitter: 'https://twitter.com/myapp',
        github: 'https://github.com/myapp',
      },
    },
  }) as SiteConfig
}
```

### Usage
```tsx
function Footer() {
  const { t } = useTranslation(['common'])
  const config = getSiteConfig(t)

  return (
    <footer>
      <h4>{config.name}</h4>
      <p>{config.description}</p>
      <a href={`mailto:${config.email}`}>{config.email}</a>
      <div>
        <a href={config.socialLinks.twitter}>Twitter</a>
        <a href={config.socialLinks.github}>GitHub</a>
      </div>
    </footer>
  )
}
```

### Generated JSON
```json
{
  "site_config": {
    "name": "My Awesome App",
    "description": "The best platform for managing your projects.",
    "email": "support@example.com",
    "socialLinks": {
      "twitter": "https://twitter.com/myapp",
      "github": "https://github.com/myapp"
    }
  }
}
```

---

## Example 4: FAQ List
```typescript
export const getFAQs = (t: TFunction<'support'>): FAQItem[] => {
  return t('faqs', {
    returnObjects: true,
    defaultValue: [
      {
        question: 'How do I reset my password?',
        answer: 'Go to Settings > Security and click "Reset Password".',
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards, PayPal, and bank transfers.',
      },
      {
        question: 'Can I cancel my subscription anytime?',
        answer: 'Yes, you can cancel anytime from your account settings.',
      },
    ],
  }) as FAQItem[]
}
```

### Usage
```tsx
function FAQSection() {
  const { t } = useTranslation(['support'])
  const faqs = getFAQs(t)

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <details key={index} className="rounded border p-4">
          <summary className="cursor-pointer font-semibold">
            {faq.question}
          </summary>
          <p className="mt-2 text-gray-600">{faq.answer}</p>
        </details>
      ))}
    </div>
  )
}
```

---

## File Structure Recommendation
```
src/
├── lib/
│   └── i18n/
│       ├── navigation.ts     # getMainNavigation
│       ├── pricing.ts        # getPricingPlans
│       ├── site-config.ts    # getSiteConfig
│       └── support.ts        # getFAQs
└── messages/
    ├── en/
    │   ├── navigation.json
    │   ├── pricing.json
    │   ├── common.json
    │   └── support.json
    └── tr/
        ├── navigation.json
        ├── pricing.json
        ├── common.json
        └── support.json
```

---

## Key Points

- ✅ `returnObjects: true` is **MANDATORY** for arrays and objects
- ✅ Type-safe with TypeScript interfaces
- ✅ Template literals and constants are resolved by the extraction tool
- ✅ Function names typically start with `get`
- ✅ Works for both **arrays** (`[]`) and **objects** (`{}`)
- ❌ **Never** manually edit JSON arrays/objects
- 🎯 Tool automatically flattens and structures the JSON output
