# Advanced Pluralization + Context Example

This example demonstrates the most complex scenario: combining pluralization with context (e.g., gender + count).

## Social Relationship Status
```typescript
import { useTranslation } from 'react-i18next'

type Gender = 'male' | 'female' | 'non_binary'

interface RelationshipProps {
  count: number
  gender: Gender
}

export function SocialStatus({ count, gender }: RelationshipProps) {
  const { t } = useTranslation(['social'])

  /**
   * AGGRESSIVE PLURALIZATION + CONTEXT EXAMPLE
   *
   * Here we are using i18next's resolution logic:
   * 1. key_context_plural (e.g., relationship_male_other)
   * 2. key_context (e.g., relationship_male)
   * 3. key_plural (e.g., relationship_other)
   * 4. key (e.g., relationship)
   *
   * Our AST tool appends everything after 'defaultValue_' (suffix)
   * to the key when writing to JSON.
   */
  const statusText = t('social:relationship', {
    count,
    context: gender, // 'male', 'female', 'non_binary'

    // 1. FALLBACK (Neutral / Undefined Gender)
    defaultValue: 'Just a friend',               // count === 1 && context === 'non_binary' (or unmatched)
    defaultValue_other: '{{count}} friends',     // count > 1  && context === 'non_binary'

    // 2. MALE (Male Context)
    defaultValue_male: 'He is a boyfriend',             // count === 1 && context === 'male'
    defaultValue_male_other: '{{count}} boyfriends',    // count > 1  && context === 'male'

    // 3. FEMALE (Female Context)
    defaultValue_female: 'She is a girlfriend',           // count === 1 && context === 'female'
    defaultValue_female_other: '{{count}} girlfriends',   // count > 1  && context === 'female'
  })

  return (
    <div className="p-4 border rounded">
      <h3>Relationship Status</h3>
      <p className="text-lg font-bold">{statusText}</p>
    </div>
  )
}
```

## Complex Notification Example

Scenario: "[Ahmet] and [3 people] liked your photo."
```typescript
/**
 * EXAMPLE 2: Complex Notification Message
 * Scenario: "[Ahmet] and [3 people] liked your photo."
 */
export function NotificationMessage({
  name,
  otherCount,
  gender
}: {
  name: string
  otherCount: number
  gender: Gender
}) {
  const { t } = useTranslation(['notifications'])

  const message = t('notifications:photo_like', {
    count: otherCount, // Number of other people
    context: gender,   // Gender of the main liker
    name: name,

    // Singular: Only Ahmet liked (count: 0 means +0 other people)
    defaultValue: '{{name}} liked your photo.',
    defaultValue_male: '{{name}} (he) liked your photo.',
    defaultValue_female: '{{name}} (she) liked your photo.',

    // Plural: Ahmet and +3 other people liked
    defaultValue_other: '{{name}} and {{count}} others liked your photo.',
    defaultValue_male_other: '{{name}} and {{count}} others liked his photo.',
    defaultValue_female_other: '{{name}} and {{count}} others liked her photo.',
  })

  return <div className="text-sm text-gray-600">{message}</div>
}
```

## Resolution Logic

i18next resolves translations in this order:

1. `key_context_plural` → `relationship_male_other`
2. `key_context` → `relationship_male`
3. `key_plural` → `relationship_other`
4. `key` → `relationship`

## Generated JSON Structure
```json
{
  "relationship": "Just a friend",
  "relationship_other": "{{count}} friends",
  "relationship_male": "He is a boyfriend",
  "relationship_male_other": "{{count}} boyfriends",
  "relationship_female": "She is a girlfriend",
  "relationship_female_other": "{{count}} girlfriends",

  "photo_like": "{{name}} liked your photo.",
  "photo_like_male": "{{name}} (he) liked your photo.",
  "photo_like_female": "{{name}} (she) liked your photo.",
  "photo_like_other": "{{name}} and {{count}} others liked your photo.",
  "photo_like_male_other": "{{name}} and {{count}} others liked his photo.",
  "photo_like_female_other": "{{name}} and {{count}} others liked her photo."
}
```

## Key Points

- ✅ Combines `count` and `context` parameters
- ✅ Covers all combinations: neutral, male, female × singular, plural
- ✅ Uses suffix pattern: `defaultValue_[context]_[plural]`
- ✅ Interpolation works: `{{name}}`, `{{count}}`
- 🎯 Tool automatically generates all suffixed keys in JSON
