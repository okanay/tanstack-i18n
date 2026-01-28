import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/{-$locale}/products/$slug/payment')({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useTranslation(['products'])
  const params = Route.useParams()

  return (
    <div className="flex flex-col gap-y-1 px-4">
      <span>
        {t('products:payment.title', {
          slug: params.slug,
          defaultValue: 'Product {{slug}} payment',
        })}
      </span>

      <div className="my-4 rounded border border-gray-100 bg-gray-50 p-4">
        <p>{t('products:payment.info', { defaultValue: 'Secure payment gateway processing...' })}</p>
      </div>

      <Link to="/{-$locale}" className="w-fit rounded-xs border border-indigo-200 bg-indigo-50 px-4 py-2">
        {t('products:links.index', { defaultValue: 'Go To Index Page' })}
      </Link>
    </div>
  )
}
