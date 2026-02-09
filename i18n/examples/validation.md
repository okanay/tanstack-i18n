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
 export type ContactFormValues = z.infer<ReturnType<typeof createContactSchema>>
 export const createContactSchema = (t: TFunction<'validation'>) => {
   return z.object({
     email: z.email({
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
```

## Usage in Component
```tsx
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createContactSchema, type ContactFormValues } from './schemas/contact'

function RouteComponent() {
  const { t } = useTranslation(['validation'])
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
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
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
        {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>}
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


## Example `messages/en/validation.json` Translation File
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
