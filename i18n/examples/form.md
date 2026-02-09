# Form Example with Zod Validation

This example demonstrates how to use the factory pattern for Zod schemas with i18next translations.

## Code
```tsx
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createContactSchema, type ContactFormValues } from './validation'

export function ContactForm() {
  // We're loading the 'validation' namespace
  const { t } = useTranslation(['validation', 'common'])

  // Call the schema factory.
  // The React Compiler will handle memoization, no need to worry.
  const schema = createContactSchema(t)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data: ContactFormValues) => {
    console.log(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label>{t('common:form.email', { defaultValue: 'Email Address' })}</label>
        <input {...register('email')} className="border p-2" />
        {errors.email && <p className="text-red-500">{errors.email.message}</p>}
      </div>

      <div>
        <label>{t('common:form.message', { defaultValue: 'Your Message' })}</label>
        <textarea {...register('message')} className="border p-2" />
        {errors.message && <p className="text-red-500">{errors.message.message}</p>}
      </div>

      <button type="submit">
        {t('common:actions.submit', { defaultValue: 'Send Message' })}
      </button>
    </form>
  )
}
```

## Key Points

- ✅ Schema factory called directly without `useMemo`
- ✅ React Compiler handles optimization
- ✅ Multiple namespaces loaded: `['validation', 'common']`
- ✅ All text uses `t()` with `defaultValue`
