import { getCanonicalLinks } from '@/i18n/utils/canonical'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/{-$locale}/products/search')({
  head: ({ params }) => ({
    links: getCanonicalLinks('/products/search', params.locale),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { t } = useTranslation(['products'])

  return (
    <div className="flex flex-col gap-y-1 px-4">
      <span>{t('products:search.title', { defaultValue: 'Product Search Page' })}</span>

      <form
        className="my-4"
        onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          const query = formData.get('query')?.toString() || ''
          navigate({
            to: '/{-$locale}/products/$slug',
            params: {
              slug: query.toLowerCase().replace(/\s+/g, '-'),
            },
          })
        }}
      >
        <input
          name="query"
          type="text"
          placeholder={t('products:search.placeholder', { defaultValue: 'Search for products...' })}
          className="w-full max-w-sm rounded border p-2"
        />
        <button type="submit" className="ml-2 rounded bg-blue-500 px-4 py-2 text-white">
          {t('products:search.button', { defaultValue: 'Search' })}
        </button>
      </form>

      <Link to="/{-$locale}" className="w-fit rounded-xs border border-indigo-200 bg-indigo-50 px-4 py-2">
        {t('products:links.index', { defaultValue: 'Go To Index Page' })}
      </Link>
    </div>
  )
}
