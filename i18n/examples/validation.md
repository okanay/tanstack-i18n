# Zod Validation with React Hook Form

This example demonstrates how to create type-safe Zod schemas with i18next translations using the factory pattern.

## Schema Factory Pattern
```typescript
import { z } from 'zod'
import type { TFunction } from 'i18next'

/**
 * Contact Form Schema Factory
 *
 * We wrap the schema in a function that accepts the `t` function.
 * This allows us to use translations for validation error messages.
 *
 * ⚠️ DO NOT use useMemo - React Compiler handles optimization.
 */
export const createContactSchema = (t: TFunction<'validation'>) => {
  return z.object({
    email: z
      .string()
      .min(1, {
        message: t('validation:field_required', {
          defaultValue: 'This field is required.',
        }),
      })
      .email({
        message: t('validation:email_invalid', {
          defaultValue: 'Please enter a valid email address.',
        }),
      }),

    message: z
      .string()
      .min(10, {
        message: t('validation:message_min', {
          defaultValue: 'Message must be at least {{count}} characters.',
          count: 10,
        }),
      })
      .max(500, {
        message: t('validation:message_max', {
          defaultValue: 'Message cannot exceed {{count}} characters.',
          count: 500,
        }),
      }),
  })
}

// Extract the TypeScript type from the schema
export type ContactFormValues = z.infer<ReturnType<typeof createContactSchema>>
```

## Complex Schema Example
```typescript
import { z } from 'zod'
import type { TFunction } from 'i18next'

/**
 * User Registration Schema with Complex Validations
 */
export const createRegistrationSchema = (t: TFunction<'validation'>) => {
  return z
    .object({
      username: z
        .string()
        .min(3, {
          message: t('validation:username_min', {
            defaultValue: 'Username must be at least {{count}} characters.',
            count: 3,
          }),
        })
        .max(20, {
          message: t('validation:username_max', {
            defaultValue: 'Username cannot exceed {{count}} characters.',
            count: 20,
          }),
        })
        .regex(/^[a-zA-Z0-9_]+$/, {
          message: t('validation:username_format', {
            defaultValue: 'Username can only contain letters, numbers, and underscores.',
          }),
        }),

      email: z
        .string()
        .min(1, {
          message: t('validation:field_required', {
            defaultValue: 'This field is required.',
          }),
        })
        .email({
          message: t('validation:email_invalid', {
            defaultValue: 'Please enter a valid email address.',
          }),
        }),

      password: z
        .string()
        .min(8, {
          message: t('validation:password_min', {
            defaultValue: 'Password must be at least {{count}} characters.',
            count: 8,
          }),
        })
        .regex(/[A-Z]/, {
          message: t('validation:password_uppercase', {
            defaultValue: 'Password must contain at least one uppercase letter.',
          }),
        })
        .regex(/[a-z]/, {
          message: t('validation:password_lowercase', {
            defaultValue: 'Password must contain at least one lowercase letter.',
          }),
        })
        .regex(/[0-9]/, {
          message: t('validation:password_number', {
            defaultValue: 'Password must contain at least one number.',
          }),
        }),

      confirmPassword: z.string(),

      age: z
        .number({
          invalid_type_error: t('validation:age_invalid', {
            defaultValue: 'Age must be a number.',
          }),
        })
        .min(18, {
          message: t('validation:age_min', {
            defaultValue: 'You must be at least {{count}} years old.',
            count: 18,
          }),
        })
        .max(120, {
          message: t('validation:age_max', {
            defaultValue: 'Please enter a valid age.',
          }),
        }),

      terms: z.boolean().refine((val) => val === true, {
        message: t('validation:terms_required', {
          defaultValue: 'You must accept the terms and conditions.',
        }),
      }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation:password_mismatch', {
        defaultValue: 'Passwords do not match.',
      }),
      path: ['confirmPassword'], // Error will be shown on confirmPassword field
    })
}

export type RegistrationFormValues = z.infer<ReturnType<typeof createRegistrationSchema>>
```

## Usage in Component
```tsx
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createContactSchema, type ContactFormValues } from './schemas/contact'

export function ContactForm() {
  // Load the 'validation' and 'common' namespaces
  const { t } = useTranslation(['validation', 'common'])

  // Create schema - React Compiler handles optimization
  const schema = createContactSchema(t)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: ContactFormValues) => {
    try {
      // API call here
      console.log('Form data:', data)
    } catch (error) {
      console.error('Submission error:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          {t('common:form.email', { defaultValue: 'Email Address' })}
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className="mt-1 block w-full rounded border p-2"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Message Field */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium">
          {t('common:form.message', { defaultValue: 'Your Message' })}
        </label>
        <textarea
          id="message"
          rows={4}
          {...register('message')}
          className="mt-1 block w-full rounded border p-2"
        />
        {errors.message && (
          <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting
          ? t('common:actions.submitting', { defaultValue: 'Sending...' })
          : t('common:actions.submit', { defaultValue: 'Send Message' })}
      </button>
    </form>
  )
}
```

## Advanced Usage with Registration Form
```tsx
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createRegistrationSchema, type RegistrationFormValues } from './schemas/registration'

export function RegistrationForm() {
  const { t } = useTranslation(['validation', 'auth'])

  // Create schema with translations
  const schema = createRegistrationSchema(t)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      age: undefined,
      terms: false,
    },
  })

  const onSubmit = async (data: RegistrationFormValues) => {
    try {
      // API call
      console.log('Registration data:', data)
    } catch (error) {
      console.error('Registration error:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-md space-y-6">
      {/* Username */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium">
          {t('auth:form.username', { defaultValue: 'Username' })}
        </label>
        <input
          id="username"
          {...register('username')}
          className="mt-1 block w-full rounded border p-2"
        />
        {errors.username && (
          <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          {t('auth:form.email', { defaultValue: 'Email Address' })}
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className="mt-1 block w-full rounded border p-2"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          {t('auth:form.password', { defaultValue: 'Password' })}
        </label>
        <input
          id="password"
          type="password"
          {...register('password')}
          className="mt-1 block w-full rounded border p-2"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium">
          {t('auth:form.confirm_password', { defaultValue: 'Confirm Password' })}
        </label>
        <input
          id="confirmPassword"
          type="password"
          {...register('confirmPassword')}
          className="mt-1 block w-full rounded border p-2"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      {/* Age */}
      <div>
        <label htmlFor="age" className="block text-sm font-medium">
          {t('auth:form.age', { defaultValue: 'Age' })}
        </label>
        <input
          id="age"
          type="number"
          {...register('age', { valueAsNumber: true })}
          className="mt-1 block w-full rounded border p-2"
        />
        {errors.age && (
          <p className="mt-1 text-sm text-red-600">{errors.age.message}</p>
        )}
      </div>

      {/* Terms & Conditions */}
      <div className="flex items-start">
        <input
          id="terms"
          type="checkbox"
          {...register('terms')}
          className="mt-1 h-4 w-4"
        />
        <label htmlFor="terms" className="ml-2 text-sm">
          {t('auth:form.terms_label', {
            defaultValue: 'I agree to the Terms and Conditions',
          })}
        </label>
      </div>
      {errors.terms && (
        <p className="text-sm text-red-600">{errors.terms.message}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting
          ? t('auth:actions.registering', { defaultValue: 'Creating Account...' })
          : t('auth:actions.register', { defaultValue: 'Create Account' })}
      </button>
    </form>
  )
}
```

## Generated JSON Structure
```json
{
  "field_required": "This field is required.",
  "email_invalid": "Please enter a valid email address.",
  "message_min": "Message must be at least {{count}} characters.",
  "message_max": "Message cannot exceed {{count}} characters.",
  "username_min": "Username must be at least {{count}} characters.",
  "username_max": "Username cannot exceed {{count}} characters.",
  "username_format": "Username can only contain letters, numbers, and underscores.",
  "password_min": "Password must be at least {{count}} characters.",
  "password_uppercase": "Password must contain at least one uppercase letter.",
  "password_lowercase": "Password must contain at least one lowercase letter.",
  "password_number": "Password must contain at least one number.",
  "password_mismatch": "Passwords do not match.",
  "age_invalid": "Age must be a number.",
  "age_min": "You must be at least {{count}} years old.",
  "age_max": "Please enter a valid age.",
  "terms_required": "You must accept the terms and conditions."
}
```

## Key Points

- ✅ **Factory Pattern**: Schema wrapped in a function that accepts `t`
- ✅ **No useMemo**: React Compiler handles optimization automatically
- ✅ **Type Safety**: Use `z.infer<ReturnType<typeof createSchema>>` for form types
- ✅ **Interpolation**: Use `{{count}}` in validation messages
- ✅ **Complex Validation**: Supports regex, custom refine, cross-field validation
- ✅ **Multiple Namespaces**: Load `['validation', 'common', 'auth']` as needed
- ⚠️ **defaultValue Required**: Every `t()` call must have `defaultValue`

## Common Zod Validations
```typescript
// String validations
z.string()
  .min(n, { message: '...' })
  .max(n, { message: '...' })
  .email({ message: '...' })
  .url({ message: '...' })
  .regex(/pattern/, { message: '...' })
  .trim()
  .toLowerCase()

// Number validations
z.number({ invalid_type_error: '...' })
  .min(n, { message: '...' })
  .max(n, { message: '...' })
  .int({ message: '...' })
  .positive({ message: '...' })

// Boolean validation
z.boolean()
  .refine(val => val === true, { message: '...' })

// Custom validation
z.string()
  .refine((val) => customCheck(val), {
    message: '...'
  })

// Cross-field validation
.refine((data) => data.field1 === data.field2, {
  message: '...',
  path: ['field2']
})
```

## File Structure Recommendation
```
src/
├── lib/
│   └── schemas/
│       ├── contact.ts          # createContactSchema
│       ├── registration.ts     # createRegistrationSchema
│       └── profile.ts          # createProfileSchema
└── components/
    └── forms/
        ├── ContactForm.tsx
        ├── RegistrationForm.tsx
        └── ProfileForm.tsx
```
