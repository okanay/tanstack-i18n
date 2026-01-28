import { getSeoMetadata } from '@/i18n/utils/seo'
import { getCanonicalLinks } from '@/i18n/utils/canonical'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/{-$locale}/about')({
  head: ({ params }) => ({
    meta: getSeoMetadata('/about', params.locale),
    links: getCanonicalLinks('/about', params.locale),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useTranslation(['about'])
  const params = Route.useParams()
  const locale = params.locale || 'en'
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-y-1 px-4">
      <span>{t('about:page_title', { locale, defaultValue: 'About {{locale}}' })}</span>

      <Link to="/{-$locale}" className="w-fit rounded-xs border border-indigo-200 bg-indigo-50 px-4 py-2">
        {t('about:links.index', { defaultValue: 'Go To Index Page' })}
      </Link>

      <button
        className="w-fit rounded-xs border border-amber-200 bg-amber-50 px-4 py-2"
        onClick={() => {
          navigate({ to: '/{-$locale}' })
        }}
      >
        {t('about:links.index_navigate', { defaultValue: 'Go To Index Page with Navigate' })}
      </button>
    </div>
  )
}
