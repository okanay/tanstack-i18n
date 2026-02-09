import globals from '@/assets/styles/globals.css?url'
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/i18n/config'
import { loadLanguageResources } from '@/i18n/loader'
import { LanguageProvider } from '@/i18n/provider'
import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async ({ location }) => {
    const segments = location.pathname.split('/').filter(Boolean)
    const langSegment = segments[0]

    const language = SUPPORTED_LANGUAGES.find((lang) => lang.value === langSegment) || DEFAULT_LANGUAGE
    const resources = await loadLanguageResources(language.value)

    return { resources, language }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: globals,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { resources, language } = Route.useRouteContext()

  return (
    <html lang={language.locale} dir={language.direction}>
      <head>
        <HeadContent />
      </head>
      <body>
        <LanguageProvider initialLanguageValue={language.value} initialResources={resources}>
          {children}
        </LanguageProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            {
              name: 'Tanstack Query',
              render: <ReactQueryDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
