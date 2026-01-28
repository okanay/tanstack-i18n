import { getSeoMetadata } from '@/i18n/utils/seo'
import { getCanonicalLinks } from '@/i18n/utils/canonical'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/{-$locale}/contact')({
  head: ({ params }) => ({
    meta: getSeoMetadata('/contact', params.locale),
    links: getCanonicalLinks('/contact', params.locale),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useTranslation(['contact'])
  const params = Route.useParams()
  const locale = params.locale || 'en'
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-y-1 px-4">
      <span>{t('contact:page_title', { locale, defaultValue: 'Contact {{locale}}' })}</span>

      <Link to="/{-$locale}" className="w-fit rounded-xs border border-indigo-200 bg-indigo-50 px-4 py-2">
        {t('contact:links.index', { defaultValue: 'Go To Index Page' })}
      </Link>

      <button
        className="w-fit rounded-xs border border-amber-200 bg-amber-50 px-4 py-2"
        onClick={() => {
          navigate({ to: '/{-$locale}' })
        }}
      >
        {t('contact:links.index_navigate', { defaultValue: 'Go To Index Page with Navigate' })}
      </button>
    </div>
  )
}
