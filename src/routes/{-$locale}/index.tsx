import { getSeoMetadata } from '@/i18n/utils/seo'
import { getCanonicalLinks } from '@/i18n/utils/canonical'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/{-$locale}/')({
  head: ({ params }) => ({
    meta: getSeoMetadata('/', params.locale),
    links: getCanonicalLinks('/', params.locale),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useTranslation(['home'])
  const navigate = useNavigate()
  const username = 'Okan Ay'

  return (
    <div className="flex flex-col gap-y-1 px-4">
      <h1>
        {t('home:greeting', {
          username,
          defaultValue: 'Hello {{username}}',
        })}
      </h1>

      <div className="mt-4 flex flex-col gap-y-2">
        <h2 className="text-lg font-semibold">{t('home:sections.pages', { defaultValue: 'Pages' })}</h2>

        <Link to="/{-$locale}/about" className="w-fit rounded-xs border border-indigo-200 bg-indigo-50 px-4 py-2">
          {t('home:links.about', { defaultValue: 'Go To About Page' })}
        </Link>

        <Link to="/{-$locale}/contact" className="w-fit rounded-xs border border-rose-200 bg-rose-50 px-4 py-2">
          {t('home:links.contact', { defaultValue: 'Go To Contact Page' })}
        </Link>

        <Link to="/{-$locale}/products" className="w-fit rounded-xs border border-teal-200 bg-teal-50 px-4 py-2">
          {t('home:links.products', { defaultValue: 'Go To Products' })}
        </Link>

        <button
          className="w-fit rounded-xs border border-amber-200 bg-amber-50 px-4 py-2"
          onClick={() => {
            navigate({ to: '/{-$locale}/about' })
          }}
        >
          {t('home:links.about_navigate', {
            defaultValue: 'Go To About Page with Navigate',
          })}
        </button>
      </div>
    </div>
  )
}
