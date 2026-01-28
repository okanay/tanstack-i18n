import { getCanonicalLinks } from '@/i18n/utils/canonical'
import { createFileRoute, Link } from '@tanstack/react-router'
import { type TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/{-$locale}/products/')({
  head: ({ params }) => ({
    links: getCanonicalLinks('/products', params.locale),
  }),
  component: RouteComponent,
})

type Product = {
  title: string
  desc: string
  slug: string
}

export function GetProducts(t: TFunction<'products'>) {
  return t('list', {
    returnObjects: true,
    defaultValue: [
      { title: 'Classic T-Shirt', desc: 'A comfortable and versatile everyday essential.', slug: 'classic-t-shirt' },
      { title: 'Denim Jeans', desc: 'Durable and stylish jeans for any occasion.', slug: 'denim-jeans' },
      { title: 'Hooded Sweatshirt', desc: 'Warm and cozy pullover with a classic hood.', slug: 'hooded-sweatshirt' },
      { title: 'Summer Dress', desc: 'Lightweight and airy dress perfect for warm weather.', slug: 'summer-dress' },
      { title: 'Running Shorts', desc: 'Breathable shorts designed for maximum athletic performance.', slug: 'running-shorts' },
    ],
  }) as Product[]
}

function RouteComponent() {
  const { t } = useTranslation(['products'])
  const products = GetProducts(t)

  return (
    <div className="flex flex-col gap-y-1 px-4">
      <span>{t('products:index_title', { defaultValue: 'Product Index Page' })}</span>

      <Link to="/{-$locale}" className="w-fit rounded-xs border border-indigo-200 bg-indigo-50 px-4 py-2">
        {t('products:links.index', { defaultValue: 'Go To Index Page' })}
      </Link>

      <div className="mt-4 flex flex-col gap-y-2 pb-12">
        <h2 className="text-lg font-semibold">{t('products:sections.list', { defaultValue: 'Product List' })}</h2>
        {products.map((p) => (
          <div key={p.slug} className="rounded-md border border-gray-200 p-4">
            <h3 className="text-md font-semibold">{p.title}</h3>
            <p className="text-sm text-gray-600">{p.desc}</p>
            <Link to="/{-$locale}/products/$slug" params={{ slug: p.slug }} className="mt-2 inline-block text-blue-500 underline">
              {t('products:links.view_details', { defaultValue: 'View Details' })}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
