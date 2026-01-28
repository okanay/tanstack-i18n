import { getSeoMetadata } from '@/i18n/utils/seo'
import { LANGUAGES_VALUES } from '@/i18n/config'
import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'
import { LanguageSwitcher } from '@/i18n/components/language-switcher'

export const Route = createFileRoute('/{-$locale}')({
  loader: ({ params }) => {
    if (params.locale) {
      let isLocaleSupported = false

      isLocaleSupported = LANGUAGES_VALUES.some((f) => {
        return f === params.locale
      })

      if (!isLocaleSupported) {
        throw notFound()
      }
    }
  },
  head: ({ params }) => ({
    meta: getSeoMetadata('/', params.locale),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <LanguageSwitcher />
      <Outlet />
    </>
  )
}
