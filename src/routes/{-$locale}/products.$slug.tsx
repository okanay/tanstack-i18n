import { getCanonicalLinks } from '@/i18n/utils/canonical'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/{-$locale}/products/$slug')({
  head: ({ params }) => ({
    links: getCanonicalLinks('/products/$slug', params.locale, [params.slug]),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useTranslation(['products'])
  const params = Route.useParams()

  return (
    <div className="flex flex-col gap-y-1 px-4">
      <span>
        {t('products:detail.title', {
          slug: params.slug,
          defaultValue: 'Product {{slug}}',
        })}
      </span>

      <Link to="/{-$locale}" className="w-fit rounded-xs border border-indigo-200 bg-indigo-50 px-4 py-2">
        {t('products:links.index', { defaultValue: 'Go To Index Page' })}
      </Link>

      <Link
        to="/{-$locale}/products/$slug/payment"
        params={{ slug: params.slug }}
        className="mt-2 w-fit rounded-xs border border-green-200 bg-green-50 px-4 py-2"
      >
        {t('products:detail.buy_now', { defaultValue: 'Buy Now' })}
      </Link>
    </div>
  )
}
