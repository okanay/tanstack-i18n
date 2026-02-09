# Pluralization & Context Examples

This example demonstrates how to use pluralization and context together.

## Basic Example
```tsx
import { useTranslation } from 'react-i18next'

type Gender = 'male' | 'female' | 'non_binary'

interface RelationshipProps {
  count: number
  gender: Gender
}

function SocialStatus({ count, gender }: RelationshipProps) {
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

  return <p className="text-lg font-bold">{statusText}</p>
}
```

## Generated JSON
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

## Resolution Logic

i18next resolves translations in this order:

1. `key_context_plural` → `relationship_male_other`
2. `key_context` → `relationship_male`
3. `key_plural` → `relationship_other`
4. `key` → `relationship`

## Key Points

- ✅ Use `count` parameter for pluralization
- ✅ Use `context` parameter for variations (gender, role, etc.)
- ✅ Combine both with suffix pattern: `defaultValue_[context]_[plural]`
- ✅ `{{count}}` interpolates the number
- 🎯 Tool automatically generates all suffixed keys in JSON
